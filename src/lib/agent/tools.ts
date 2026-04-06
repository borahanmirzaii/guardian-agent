import { tool, type Tool } from "ai";
import { z } from "zod/v4";
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import {
  withGitHubRead,
  withGoogleRead,
  withStepUpRemediation,
} from "../auth0-ai";
import { scanGitHubSecrets } from "../tools/scan-github-secrets";
import { scanGoogleForwarding } from "../tools/scan-google-forwarding";
import {
  getMockGitHubFindings,
  getMockGoogleFindings,
} from "../tools/mock-scanner";
import {
  insertScan,
  completeScan,
  insertFinding,
  getFindingById,
  updateFindingStatus,
  insertRemediation,
  updateRemediation,
  getFindingsForUser,
} from "../db";
import { logAudit } from "../audit";
import { Octokit } from "octokit";
import { google } from "googleapis";

// @auth0/ai-vercel uses zod v3, ai SDK uses zod v4 — cast through any to bridge
/* eslint-disable @typescript-eslint/no-explicit-any */
const wrap = (wrapper: any, t: any) => wrapper(t) as any;

export function createAgentTools(userId: string) {
  const scanGitHub = wrap(withGitHubRead, tool({
      description:
        "Scan the user's GitHub repositories for exposed secrets, API keys, and credentials. Uses read-only access via Token Vault.",
      inputSchema: z.object({
        maxRepos: z
          .number()
          .optional()
          .describe("Maximum number of repos to scan (default 5)"),
      }),
      execute: async ({ maxRepos }) => {
        const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        insertScan({ id: scanId, user_id: userId });
        logAudit({
          userId,
          event: "scan_started",
          provider: "github",
          scopes: ["repo:read"],
        });

        try {
          const useMock = process.env.USE_MOCK_TOKENS === "true";
          let findings;

          if (useMock) {
            findings = getMockGitHubFindings();
          } else {
            const accessToken = getAccessTokenFromTokenVault();
            findings = await scanGitHubSecrets(accessToken, { maxRepos });
            logAudit({
              userId,
              event: "token_vault_success",
              provider: "github",
            });
          }

          const normalized = findings.map((f) => ({
            provider: "github" as const,
            type: "exposed_secret",
            severity: f.severity,
            title: `${f.secretType} exposed in ${f.repo}`,
            description: f.description,
            evidence: {
              repo: f.repo,
              file: f.file,
              line: f.line,
              snippet: f.snippet,
            },
            recommended_action:
              "Create GitHub issue to alert team and rotate the credential",
          }));

          for (const finding of normalized) {
            insertFinding({ scan_id: scanId, user_id: userId, ...finding });
            logAudit({
              userId,
              event: "finding_detected",
              provider: "github",
              details: {
                type: finding.type,
                severity: finding.severity,
                title: finding.title,
              },
            });
          }

          completeScan(scanId, normalized.length);
          logAudit({
            userId,
            event: "scan_completed",
            details: {
              scan_id: scanId,
              findings_count: normalized.length,
              provider: "github",
            },
          });

          return {
            scan_id: scanId,
            findings_count: normalized.length,
            findings: normalized.map((f) => ({
              title: f.title,
              severity: f.severity,
              file: f.evidence.file,
              repo: f.evidence.repo,
              line: f.evidence.line,
            })),
          };
        } catch (error) {
          completeScan(scanId, 0, "failed");
          return { error: `GitHub scan failed: ${String(error)}` };
        }
      },
    })
  );

  const scanGoogle = wrap(withGoogleRead, tool({
      description:
        "Scan the user's Gmail for suspicious forwarding rules that could exfiltrate data. Uses read-only access via Token Vault.",
      inputSchema: z.object({}),
      execute: async () => {
        const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        insertScan({ id: scanId, user_id: userId });
        logAudit({
          userId,
          event: "scan_started",
          provider: "google",
          scopes: ["gmail.readonly"],
        });

        try {
          const useMock = process.env.USE_MOCK_TOKENS === "true";
          let findings;

          if (useMock) {
            findings = getMockGoogleFindings();
          } else {
            const accessToken = getAccessTokenFromTokenVault();
            findings = await scanGoogleForwarding(accessToken);
            logAudit({
              userId,
              event: "token_vault_success",
              provider: "google",
            });
          }

          const normalized = findings.map((f) => ({
            provider: "google" as const,
            type: "forwarding_rule",
            severity: "high" as const,
            title: `Suspicious forwarding rule to ${f.email}`,
            description: `Email is being forwarded to external address: ${f.email}`,
            evidence: { email: f.email, disposition: f.disposition },
            recommended_action:
              "Remove the forwarding rule to prevent data exfiltration",
          }));

          for (const finding of normalized) {
            insertFinding({ scan_id: scanId, user_id: userId, ...finding });
            logAudit({
              userId,
              event: "finding_detected",
              provider: "google",
              details: {
                type: finding.type,
                severity: finding.severity,
                title: finding.title,
              },
            });
          }

          completeScan(scanId, normalized.length);
          logAudit({
            userId,
            event: "scan_completed",
            details: {
              scan_id: scanId,
              findings_count: normalized.length,
              provider: "google",
            },
          });

          return {
            scan_id: scanId,
            findings_count: normalized.length,
            findings: normalized.map((f) => ({
              title: f.title,
              severity: f.severity,
              email: f.evidence.email,
            })),
          };
        } catch (error) {
          completeScan(scanId, 0, "failed");
          return { error: `Google scan failed: ${String(error)}` };
        }
      },
    })
  );

  const listFindings = tool({
    description:
      "List current security findings for the user, optionally filtered by status (open, remediating, remediated, dismissed).",
    inputSchema: z.object({
      status: z
        .enum(["open", "remediating", "remediated", "dismissed"])
        .optional()
        .describe("Filter by finding status"),
    }),
    execute: async ({ status }: { status?: string }) => {
      const findings = getFindingsForUser(userId, status);
      return findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        provider: f.provider,
        status: f.status,
        description: f.description,
        recommended_action: f.recommended_action,
        evidence: f.evidence ? JSON.parse(f.evidence) : null,
      }));
    },
  });

  const remediateFinding = wrap(withStepUpRemediation, tool({
      description:
        "Execute a protective action to remediate a security finding. Requires step-up authorization (CIBA) to elevate from read-only to write access for 60 seconds. For GitHub findings: creates an issue. For Google findings: removes the forwarding rule.",
      inputSchema: z.object({
        findingId: z.number().describe("The ID of the finding to remediate"),
      }),
      execute: async ({ findingId }) => {
        const finding = getFindingById(findingId);
        if (!finding || finding.user_id !== userId) {
          return { error: "Finding not found" };
        }

        const evidence = finding.evidence
          ? JSON.parse(finding.evidence)
          : {};
        const action =
          finding.provider === "github"
            ? "create_issue"
            : "remove_forwarding";
        const elevatedScopes =
          finding.provider === "github"
            ? ["repo:write"]
            : ["gmail.settings.sharing"];

        const remediation = insertRemediation({
          finding_id: findingId,
          user_id: userId,
          action,
          elevated_scopes: elevatedScopes,
          token_ttl: 60,
        });

        logAudit({
          userId,
          event: "step_up_requested",
          provider: finding.provider,
          scopes: elevatedScopes,
          details: { finding_id: findingId, action, reason: finding.title },
        });

        updateFindingStatus(findingId, "remediating");

        logAudit({
          userId,
          event: "step_up_approved",
          provider: finding.provider,
          scopes: elevatedScopes,
        });

        const now = new Date();
        logAudit({
          userId,
          event: "write_token_minted",
          provider: finding.provider,
          scopes: elevatedScopes,
          details: {
            ttl: 60,
            expires_at: new Date(now.getTime() + 60000).toISOString(),
          },
        });

        try {
          const useMock = process.env.USE_MOCK_TOKENS === "true";
          let result: string;

          if (action === "create_issue" && finding.provider === "github") {
            if (useMock) {
              result = `Created GitHub issue on ${evidence.repo}: "Security Alert: ${finding.title}"`;
            } else {
              const accessToken = getAccessTokenFromTokenVault();
              const octokit = new Octokit({ auth: accessToken });
              const [owner, name] = (evidence.repo as string).split("/");
              const { data: issue } = await octokit.rest.issues.create({
                owner,
                repo: name,
                title: `Security Alert: ${finding.title}`,
                body: [
                  "## Guardian Security Alert",
                  "",
                  `**Finding:** ${finding.title}`,
                  "",
                  "This issue was automatically created by Guardian Agent after step-up approval.",
                  "Please rotate the exposed credential immediately.",
                  "",
                  "---",
                  "*Created by Guardian Agent with time-limited write access.*",
                ].join("\n"),
                labels: ["security"],
              });
              result = `Created GitHub issue #${issue.number} on ${evidence.repo}`;
            }
          } else if (
            action === "remove_forwarding" &&
            finding.provider === "google"
          ) {
            if (useMock) {
              result = `Removed forwarding rule to ${evidence.email}`;
            } else {
              const accessToken = getAccessTokenFromTokenVault();
              const auth = new google.auth.OAuth2();
              auth.setCredentials({ access_token: accessToken });
              const gmail = google.gmail({ version: "v1", auth });

              try {
                const { data: fwd } =
                  await gmail.users.settings.getAutoForwarding({
                    userId: "me",
                  });
                if (fwd.enabled && fwd.emailAddress === evidence.email) {
                  await gmail.users.settings.updateAutoForwarding({
                    userId: "me",
                    requestBody: {
                      enabled: false,
                      emailAddress: evidence.email,
                      disposition: "leaveInInbox",
                    },
                  });
                  result = `Disabled auto-forwarding to ${evidence.email}`;
                } else {
                  result = `Forwarding rule to ${evidence.email} not found or already removed`;
                }
              } catch {
                result = `Forwarding rule to ${evidence.email} not found or already removed`;
              }
            }
          } else {
            result = `Executed ${action}`;
          }

          logAudit({
            userId,
            event: "remediation_executed",
            provider: finding.provider,
            scopes: elevatedScopes,
            details: { finding_id: findingId, action, result },
          });

          updateFindingStatus(findingId, "remediated");
          updateRemediation(remediation.id, {
            step_up_decision: "approved",
            result: "success",
            executed_at: new Date().toISOString(),
            token_expired_at: new Date().toISOString(),
          });

          logAudit({
            userId,
            event: "write_token_expired",
            provider: finding.provider,
            details: {
              remediation_id: remediation.id,
              reverted_to: "read-only",
            },
          });

          return {
            success: true,
            result,
            message: "Remediation complete — access reverted to read-only",
          };
        } catch (error) {
          logAudit({
            userId,
            event: "remediation_failed",
            provider: finding.provider,
            details: { finding_id: findingId, action, error: String(error) },
          });

          updateFindingStatus(findingId, "open");
          updateRemediation(remediation.id, { result: "failed" });

          return { error: `Remediation failed: ${String(error)}` };
        }
      },
    })
  );

  return { scanGitHub, scanGoogle, listFindings, remediateFinding };
}
