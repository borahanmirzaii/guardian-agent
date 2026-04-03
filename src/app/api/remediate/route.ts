import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth0";
import {
  getFindingById,
  updateFindingStatus,
  insertRemediation,
  updateRemediation,
} from "@/lib/db";
import { logAudit } from "@/lib/audit";

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

  // Determine elevated scopes
  const elevatedScopes =
    finding.provider === "github"
      ? ["repo:write"]
      : ["gmail.settings.sharing"];

  // Create remediation record
  const remediation = insertRemediation({
    finding_id,
    user_id: userId,
    action,
    elevated_scopes: elevatedScopes,
    token_ttl: 60,
  });

  // Log step-up request
  logAudit({
    userId,
    event: "step_up_requested",
    provider: finding.provider,
    scopes: elevatedScopes,
    details: {
      finding_id,
      action,
      reason: finding.title,
    },
  });

  updateFindingStatus(finding_id, "remediating");

  // Simulate step-up approval (in real flow, CIBA would handle this)
  logAudit({
    userId,
    event: "step_up_approved",
    provider: finding.provider,
    scopes: elevatedScopes,
  });

  // Log write token minted
  const now = new Date();
  logAudit({
    userId,
    event: "write_token_minted",
    provider: finding.provider,
    scopes: elevatedScopes,
    details: { ttl: 60, expires_at: new Date(now.getTime() + 60000).toISOString() },
  });

  try {
    // Execute remediation action
    let result: string;
    if (action === "create_issue" && finding.provider === "github") {
      // In real implementation, use elevated GitHub token to create issue
      // For mock: simulate issue creation
      result = `Created GitHub issue on ${evidence.repo}: "Security Alert: ${finding.title}"`;
    } else if (
      action === "remove_forwarding" &&
      finding.provider === "google"
    ) {
      result = `Removed forwarding rule to ${evidence.email}`;
    } else {
      result = `Executed ${action}`;
    }

    // Log remediation execution
    logAudit({
      userId,
      event: "remediation_executed",
      provider: finding.provider,
      scopes: elevatedScopes,
      details: { finding_id, action, result },
    });

    // Update records
    updateFindingStatus(finding_id, "remediated");
    updateRemediation(remediation.id, {
      step_up_decision: "approved",
      result: "success",
      executed_at: new Date().toISOString(),
      token_expired_at: new Date().toISOString(),
    });

    // Log token expiry
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
