export const SCHEMA = `
CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    connection TEXT NOT NULL,
    scopes TEXT NOT NULL,
    status TEXT DEFAULT 'connected',
    connected_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, connection)
);

CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    findings_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT REFERENCES scans(id),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT,
    recommended_action TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS remediation_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    finding_id INTEGER REFERENCES findings(id),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    elevated_scopes TEXT,
    step_up_decision TEXT,
    token_ttl INTEGER,
    result TEXT,
    executed_at TEXT,
    token_expired_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event TEXT NOT NULL,
    category TEXT NOT NULL,
    provider TEXT,
    scopes TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
`;
