import { insertAuditEntry, getAuditLog, type AuditEntry } from "./db";

export type AuditEvent =
  | "scan_started"
  | "scan_completed"
  | "finding_detected"
  | "step_up_requested"
  | "step_up_approved"
  | "step_up_denied"
  | "step_up_timeout"
  | "write_token_minted"
  | "remediation_executed"
  | "remediation_failed"
  | "write_token_expired";

export type AuditCategory = "read" | "write" | "step_up" | "system";

const EVENT_CATEGORIES: Record<AuditEvent, AuditCategory> = {
  scan_started: "read",
  scan_completed: "read",
  finding_detected: "read",
  step_up_requested: "step_up",
  step_up_approved: "step_up",
  step_up_denied: "step_up",
  step_up_timeout: "step_up",
  write_token_minted: "write",
  remediation_executed: "write",
  remediation_failed: "write",
  write_token_expired: "write",
};

export function logAudit(data: {
  userId: string;
  event: AuditEvent;
  provider?: string;
  scopes?: string[];
  details?: Record<string, unknown>;
}) {
  insertAuditEntry({
    user_id: data.userId,
    event: data.event,
    category: EVENT_CATEGORIES[data.event],
    provider: data.provider,
    scopes: data.scopes,
    details: data.details,
  });
}

export function getAuditEntries(
  userId: string,
  options?: { category?: string; limit?: number; offset?: number }
): AuditEntry[] {
  return getAuditLog(userId, options);
}
