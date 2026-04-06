import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { google } from "googleapis";
import { auth0, getUser } from "@/lib/auth0";
import {
  getFindingById,
  updateFindingStatus,
  insertRemediation,
  updateRemediation,
} from "@/lib/db";
import { logAudit } from "@/lib/audit";

async function createGitHubIssue(
  token: string,
  repo: string,
  title: string
): Promise<string> {
  const octokit = new Octokit({ auth: token });
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid repo format: ${repo}`);
  }
  const { data: issue } = await octokit.rest.issues.create({
    owner,
    repo: name,
    title: `Security Alert: ${title}`,
    body: [
      "## Guardian Security Alert",
      "",
      `**Finding:** ${title}`,
      "",
      "This issue was automatically created by Guardian Agent after step-up approval.",
      "Please rotate the exposed credential immediately.",
      "",
      "---",
      "*Created by Guardian Agent with time-limited write access.*",
    ].join("\n"),
    labels: ["security"],
  });
  return `Created GitHub issue #${issue.number} on ${repo}: "${issue.title}"`;
}

async function removeGoogleForwarding(
  token: string,
  email: string
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const gmail = google.gmail({ version: "v1", auth });

  // Disable auto-forwarding if it matches
  try {
    const { data: fwd } = await gmail.users.settings.getAutoForwarding({ userId: "me" });
    if (fwd.enabled && fwd.emailAddress === email) {
      await gmail.users.settings.updateAutoForwarding({
        userId: "me",
        requestBody: { enabled: false, emailAddress: email, disposition: "leaveInInbox" },
      });
      return `Disabled auto-forwarding to ${email}`;
    }
  } catch {
    // Auto-forwarding not accessible or not matching
  }

  // Remove matching filter-based forwarding
  try {
    const { data: filtersResponse } = await gmail.users.settings.filters.list({ userId: "me" });
    const filters = filtersResponse.filter ?? [];
    for (const filter of filters) {
      if (filter.action?.forward === email && filter.id) {
        await gmail.users.settings.filters.delete({ userId: "me", id: filter.id });
        return `Removed forwarding filter to ${email}`;
      }
    }
  } catch {
    // Filter access not available
  }

  return `Forwarding rule to ${email} not found or already removed`;
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.sub as string;
  const body = await request.json();
  const { finding_id, action } = body;

  if (!finding_id || !action) {
    return NextResponse.json(
      { error: "finding_id and action are required" },
      { status: 400 }
    );
  }

  const finding = getFindingById(finding_id);
  if (!finding || finding.user_id !== userId) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  const evidence = finding.evidence ? JSON.parse(finding.evidence) : {};

  const elevatedScopes =
    finding.provider === "github"
      ? ["repo:write"]
      : ["gmail.settings.sharing"];

  const remediation = insertRemediation({
    finding_id,
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
    details: { finding_id, action, reason: finding.title },
  });

  updateFindingStatus(finding_id, "remediating");

  // Step-up approval (CIBA simulation for UI; real token comes from Token Vault)
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
    details: { ttl: 60, expires_at: new Date(now.getTime() + 60000).toISOString() },
  });

  try {
    const useMock = process.env.USE_MOCK_TOKENS === "true";
    let result: string;

    if (action === "create_issue" && finding.provider === "github") {
      if (useMock) {
        result = `Created GitHub issue on ${evidence.repo}: "Security Alert: ${finding.title}"`;
      } else {
        const { token } = await auth0.getAccessTokenForConnection({ connection: "github" });
        logAudit({
          userId,
          event: "token_vault_write_token_acquired",
          provider: "github",
        });
        result = await createGitHubIssue(token, evidence.repo as string, finding.title);
      }
    } else if (action === "remove_forwarding" && finding.provider === "google") {
      if (useMock) {
        result = `Removed forwarding rule to ${evidence.email}`;
      } else {
        const { token } = await auth0.getAccessTokenForConnection({ connection: "google-oauth2" });
        logAudit({
          userId,
          event: "token_vault_write_token_acquired",
          provider: "google",
        });
        result = await removeGoogleForwarding(token, evidence.email as string);
      }
    } else {
      result = `Executed ${action}`;
    }

    logAudit({
      userId,
      event: "remediation_executed",
      provider: finding.provider,
      scopes: elevatedScopes,
      details: { finding_id, action, result },
    });

    updateFindingStatus(finding_id, "remediated");
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
      details: { remediation_id: remediation.id, reverted_to: "read-only" },
    });

    return NextResponse.json({
      success: true,
      remediation_id: remediation.id,
      result,
      message: "Remediation complete — access reverted to read-only",
    });
  } catch (error) {
    logAudit({
      userId,
      event: "remediation_failed",
      provider: finding.provider,
      details: { finding_id, action, error: String(error) },
    });

    updateFindingStatus(finding_id, "open");
    updateRemediation(remediation.id, {
      result: "failed",
    });

    return NextResponse.json(
      { error: "Remediation failed", details: String(error) },
      { status: 500 }
    );
  }
}
