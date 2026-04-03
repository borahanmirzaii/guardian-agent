"use client";

import { AuditEntry } from "./audit-entry";
import type { AuditEntry as AuditEntryType } from "@/lib/db";

interface AuditTimelineProps {
  entries: AuditEntryType[];
}

export function AuditTimeline({ entries }: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No audit entries yet. Run a scan to start generating audit events.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry) => (
        <AuditEntry
          key={entry.id}
          event={entry.event}
          category={entry.category}
          provider={entry.provider}
          scopes={entry.scopes}
          details={entry.details}
          created_at={entry.created_at}
        />
      ))}
    </div>
  );
}
