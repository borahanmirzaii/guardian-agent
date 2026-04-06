import Database from "better-sqlite3";
import path from "path";
import { SCHEMA } from "./schema";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const railwayVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    const dbPath = railwayVolume
      ? path.join(railwayVolume, "guardian.db")
      : process.env.VERCEL
        ? ":memory:"
        : path.join(process.cwd(), "guardian.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
  }
  return db;
}

// Types
export interface Finding {
  id: number;
  scan_id: string;
  user_id: string;
  provider: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string | null;
  recommended_action: string | null;
  status: "open" | "remediating" | "remediated" | "dismissed";
  created_at: string;
}

export interface AuditEntry {
  id: number;
  user_id: string;
  event: string;
  category: "read" | "write" | "step_up" | "system";
  provider: string | null;
  scopes: string | null;
  details: string | null;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  findings_count: number;
}

export interface RemediationAction {
  id: number;
  finding_id: number;
  user_id: string;
  action: string;
  elevated_scopes: string | null;
  step_up_decision: string | null;
  token_ttl: number | null;
  result: string | null;
  executed_at: string | null;
  token_expired_at: string | null;
}

// Findings
export function insertFinding(data: {
  scan_id: string;
  user_id: string;
  provider: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
  recommended_action?: string;
}): Finding {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO findings (scan_id, user_id, provider, type, severity, title, description, evidence, recommended_action)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.scan_id,
    data.user_id,
    data.provider,
    data.type,
    data.severity,
    data.title,
    data.description,
    data.evidence ? JSON.stringify(data.evidence) : null,
    data.recommended_action ?? null
  );
  return db
    .prepare("SELECT * FROM findings WHERE id = ?")
    .get(result.lastInsertRowid) as Finding;
}

export function getFindingsForUser(
  userId: string,
  status?: string
): Finding[] {
  const db = getDb();
  if (status) {
    return db
      .prepare("SELECT * FROM findings WHERE user_id = ? AND status = ? ORDER BY created_at DESC")
      .all(userId, status) as Finding[];
  }
  return db
    .prepare("SELECT * FROM findings WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Finding[];
}

export function getFindingById(id: number): Finding | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM findings WHERE id = ?").get(id) as
    | Finding
    | undefined;
}

export function updateFindingStatus(id: number, status: string): void {
  const db = getDb();
  db.prepare("UPDATE findings SET status = ? WHERE id = ?").run(status, id);
}

// Scans
export function insertScan(data: { id: string; user_id: string }): void {
  const db = getDb();
  db.prepare("INSERT INTO scans (id, user_id) VALUES (?, ?)").run(
    data.id,
    data.user_id
  );
}

export function completeScan(
  id: string,
  findingsCount: number,
  status: "completed" | "failed" = "completed"
): void {
  const db = getDb();
  db.prepare(
    "UPDATE scans SET status = ?, completed_at = datetime('now'), findings_count = ? WHERE id = ?"
  ).run(status, findingsCount, id);
}

export function getLatestScan(userId: string): Scan | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM scans WHERE user_id = ? ORDER BY started_at DESC LIMIT 1")
    .get(userId) as Scan | undefined;
}

// Remediation
export function insertRemediation(data: {
  finding_id: number;
  user_id: string;
  action: string;
  elevated_scopes?: string[];
  token_ttl?: number;
}): RemediationAction {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO remediation_actions (finding_id, user_id, action, elevated_scopes, token_ttl)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.finding_id,
    data.user_id,
    data.action,
    data.elevated_scopes ? JSON.stringify(data.elevated_scopes) : null,
    data.token_ttl ?? 60
  );
  return db
    .prepare("SELECT * FROM remediation_actions WHERE id = ?")
    .get(result.lastInsertRowid) as RemediationAction;
}

export function updateRemediation(
  id: number,
  data: Partial<{
    step_up_decision: string;
    result: string;
    executed_at: string;
    token_expired_at: string;
  }>
): void {
  const db = getDb();
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (updates.length > 0) {
    values.push(id);
    db.prepare(
      `UPDATE remediation_actions SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);
  }
}

// Audit Log
export function insertAuditEntry(data: {
  user_id: string;
  event: string;
  category: string;
  provider?: string;
  scopes?: string[];
  details?: Record<string, unknown>;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (user_id, event, category, provider, scopes, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.user_id,
    data.event,
    data.category,
    data.provider ?? null,
    data.scopes ? JSON.stringify(data.scopes) : null,
    data.details ? JSON.stringify(data.details) : null
  );
}

export function getAuditLog(
  userId: string,
  options?: { category?: string; limit?: number; offset?: number }
): AuditEntry[] {
  const db = getDb();
  const conditions = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (options?.category) {
    conditions.push("category = ?");
    params.push(options.category);
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return db
    .prepare(
      `SELECT * FROM audit_log WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as AuditEntry[];
}

// Stats
export function getDashboardStats(userId: string) {
  const db = getDb();
  const findings = db
    .prepare("SELECT severity, COUNT(*) as count FROM findings WHERE user_id = ? AND status != 'dismissed' GROUP BY severity")
    .all(userId) as { severity: string; count: number }[];

  const lastScan = getLatestScan(userId);

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  let totalFindings = 0;
  for (const f of findings) {
    severityCounts[f.severity as keyof typeof severityCounts] = f.count;
    totalFindings += f.count;
  }

  return {
    totalFindings,
    ...severityCounts,
    lastScanAt: lastScan?.completed_at ?? lastScan?.started_at ?? null,
    lastScanStatus: lastScan?.status ?? null,
  };
}
