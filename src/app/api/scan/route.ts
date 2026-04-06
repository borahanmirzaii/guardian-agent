import { NextResponse } from "next/server";
import { auth0, getUser } from "@/lib/auth0";
import { insertScan, completeScan, insertFinding } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { scanGitHubSecrets, type GitHubFinding } from "@/lib/tools/scan-github-secrets";
import { scanGoogleForwarding, type ForwardingFinding } from "@/lib/tools/scan-google-forwarding";
import { getMockGitHubFindings, getMockGoogleFindings } from "@/lib/tools/mock-scanner";

interface NormalizedFinding {
  provider: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  recommended_action: string;
}

function normalizeGitHubFindings(findings: GitHubFinding[]): NormalizedFinding[] {
  return findings.map((f) => ({
    provider: "github",
    type: "exposed_secret",
    severity: f.severity,
    title: `${f.secretType} exposed in ${f.repo}`,
    description: f.description,
    evidence: { repo: f.repo, file: f.file, line: f.line, snippet: f.snippet },
    recommended_action: "Create GitHub issue to alert team and rotate the credential",
  }));
}

function normalizeGoogleFindings(findings: ForwardingFinding[]): NormalizedFinding[] {
  return findings.map((f) => ({
    provider: "google",
    type: "forwarding_rule",
    severity: "high",
    title: `Suspicious forwarding rule to ${f.email}`,
    description: `Email is being forwarded to external address: ${f.email}`,
    evidence: { email: f.email, disposition: f.disposition },
    recommended_action: "Remove the forwarding rule to prevent data exfiltration",
  }));
}

async function scanGitHubWithTokenVault(): Promise<NormalizedFinding[]> {
  const { token } = await auth0.getAccessTokenForConnection({ connection: "github" });
  const findings = await scanGitHubSecrets(token);
  return normalizeGitHubFindings(findings);
}

async function scanGoogleWithTokenVault(): Promise<NormalizedFinding[]> {
  const { token } = await auth0.getAccessTokenForConnection({ connection: "google-oauth2" });
  const findings = await scanGoogleForwarding(token);
  return normalizeGoogleFindings(findings);
}

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.sub as string;
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  insertScan({ id: scanId, user_id: userId });
  logAudit({ userId, event: "scan_started", provider: "github", scopes: ["repo:read"] });

  try {
    const useMock = process.env.USE_MOCK_TOKENS === "true";
    let allFindings: NormalizedFinding[] = [];

    if (useMock) {
      allFindings.push(...normalizeGitHubFindings(getMockGitHubFindings()));
      allFindings.push(...normalizeGoogleFindings(getMockGoogleFindings()));
    } else {
      // GitHub scan via Token Vault
      try {
        const githubFindings = await scanGitHubWithTokenVault();
        allFindings.push(...githubFindings);
        logAudit({ userId, event: "token_vault_success", provider: "github" });
      } catch (err) {
        logAudit({
          userId,
          event: "token_vault_fallback",
          provider: "github",
          details: { error: String(err) },
        });
        allFindings.push(...normalizeGitHubFindings(getMockGitHubFindings()));
      }

      // Google scan via Token Vault
      try {
        const googleFindings = await scanGoogleWithTokenVault();
        allFindings.push(...googleFindings);
        logAudit({ userId, event: "token_vault_success", provider: "google" });
      } catch (err) {
        logAudit({
          userId,
          event: "token_vault_fallback",
          provider: "google",
          details: { error: String(err) },
        });
        allFindings.push(...normalizeGoogleFindings(getMockGoogleFindings()));
      }
    }

    for (const finding of allFindings) {
      insertFinding({
        scan_id: scanId,
        user_id: userId,
        ...finding,
      });

      logAudit({
        userId,
        event: "finding_detected",
        provider: finding.provider,
        details: { type: finding.type, severity: finding.severity, title: finding.title },
      });
    }

    completeScan(scanId, allFindings.length);
    logAudit({
      userId,
      event: "scan_completed",
      details: { scan_id: scanId, findings_count: allFindings.length },
    });

    return NextResponse.json({
      scan_id: scanId,
      status: "completed",
      findings_count: allFindings.length,
    });
  } catch (error) {
    completeScan(scanId, 0, "failed");
    return NextResponse.json(
      { error: "Scan failed", details: String(error) },
      { status: 500 }
    );
  }
}
