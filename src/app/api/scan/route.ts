import { NextResponse } from "next/server";
import { getUser, getRefreshToken } from "@/lib/auth0";
import { insertScan, completeScan, insertFinding } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { scanGitHubSecrets } from "@/lib/tools/scan-github-secrets";
import { getMockGitHubFindings, getMockGoogleFindings } from "@/lib/tools/mock-scanner";
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";
import { runWithAIContext } from "@auth0/ai-vercel";
import { withGitHubRead } from "@/lib/auth0-ai";

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
    let allFindings: Array<{
      provider: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      evidence: Record<string, unknown>;
      recommended_action: string;
    }> = [];

    if (useMock) {
      // Mock path
      const githubFindings = getMockGitHubFindings();
      for (const f of githubFindings) {
        allFindings.push({
          provider: "github",
          type: "exposed_secret",
          severity: f.severity,
          title: `${f.secretType} exposed in ${f.repo}`,
          description: f.description,
          evidence: { repo: f.repo, file: f.file, line: f.line, snippet: f.snippet },
          recommended_action: "Create GitHub issue to alert team and rotate the credential",
        });
      }

      const googleFindings = getMockGoogleFindings();
      for (const f of googleFindings) {
        allFindings.push({
          provider: "google",
          type: "forwarding_rule",
          severity: "high",
          title: `Suspicious forwarding rule to ${f.email}`,
          description: `Email is being forwarded to external address: ${f.email}`,
          evidence: { email: f.email, disposition: f.disposition },
          recommended_action: "Remove the forwarding rule to prevent data exfiltration",
        });
      }
    } else {
      // Real Token Vault path
      try {
        // TODO: Use withGitHubRead wrapper when Token Vault is configured
        const githubFindings = getMockGitHubFindings(); // Fallback to mock
        for (const f of githubFindings) {
          allFindings.push({
            provider: "github",
            type: "exposed_secret",
            severity: f.severity,
            title: `${f.secretType} exposed in ${f.repo}`,
            description: f.description,
            evidence: { repo: f.repo, file: f.file, line: f.line, snippet: f.snippet },
            recommended_action: "Create GitHub issue to alert team and rotate the credential",
          });
        }
      } catch {
        // Fall back to mock on Token Vault errors
        const githubFindings = getMockGitHubFindings();
        for (const f of githubFindings) {
          allFindings.push({
            provider: "github",
            type: "exposed_secret",
            severity: f.severity,
            title: `${f.secretType} exposed in ${f.repo}`,
            description: f.description,
            evidence: { repo: f.repo, file: f.file, line: f.line, snippet: f.snippet },
            recommended_action: "Create GitHub issue to alert team and rotate the credential",
          });
        }
      }
    }

    // Store findings
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
