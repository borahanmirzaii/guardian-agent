"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface AuditEntryProps {
  event: string;
  category: string;
  provider: string | null;
  scopes: string | null;
  details: string | null;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  read: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  write: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  step_up: "bg-red-500/10 text-red-500 border-red-500/20",
  system: "bg-muted text-muted-foreground",
};

const EVENT_LABELS: Record<string, string> = {
  scan_started: "Scan started",
  scan_completed: "Scan completed",
  finding_detected: "Threat detected",
  step_up_requested: "Step-up requested",
  step_up_approved: "Step-up approved",
  step_up_denied: "Step-up denied",
  step_up_timeout: "Step-up timed out",
  write_token_minted: "Write token minted",
  remediation_executed: "Remediation executed",
  remediation_failed: "Remediation failed",
  write_token_expired: "Write token expired",
};

export function AuditEntry({
  event,
  category,
  provider,
  scopes,
  details,
  created_at,
}: AuditEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const parsedDetails = details ? JSON.parse(details) : null;
  const parsedScopes = scopes ? JSON.parse(scopes) : null;
  const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.system;

  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <div
          className={`h-2.5 w-2.5 rounded-full mt-1.5 ${
            category === "read"
              ? "bg-blue-500"
              : category === "write"
                ? "bg-amber-500"
                : category === "step_up"
                  ? "bg-red-500"
                  : "bg-muted-foreground"
          }`}
        />
        <div className="flex-1 w-px bg-border mt-1" />
      </div>

      <div className="flex-1 space-y-1.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {EVENT_LABELS[event] ?? event}
            </span>
            <Badge variant="outline" className={`text-xs ${categoryColor}`}>
              {category}
            </Badge>
            {provider && (
              <Badge variant="secondary" className="text-xs">
                {provider}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(created_at + "Z"), "HH:mm:ss")}
          </span>
        </div>

        {parsedScopes && (
          <div className="flex gap-1 flex-wrap">
            {(parsedScopes as string[]).map((scope: string) => (
              <Badge
                key={scope}
                variant="outline"
                className="text-xs font-mono"
              >
                {scope}
              </Badge>
            ))}
          </div>
        )}

        {parsedDetails && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              Details
            </button>
            {expanded && (
              <pre className="mt-1 rounded-md bg-muted p-2 text-xs overflow-x-auto">
                {JSON.stringify(parsedDetails, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
