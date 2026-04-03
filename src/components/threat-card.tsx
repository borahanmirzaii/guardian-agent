"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ThreatCardProps {
  id: number;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  provider: string;
  type: string;
  evidence: string | null;
  status: string;
  recommended_action: string | null;
  onRemediate?: (id: number) => void;
}

const SEVERITY_COLORS = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-500/10 text-red-500" },
  remediating: { label: "Remediating", color: "bg-amber-500/10 text-amber-500" },
  remediated: { label: "Remediated", color: "bg-emerald-500/10 text-emerald-500" },
  dismissed: { label: "Dismissed", color: "bg-muted text-muted-foreground" },
};

export function ThreatCard({
  id,
  title,
  description,
  severity,
  provider,
  type,
  evidence,
  status,
  recommended_action,
  onRemediate,
}: ThreatCardProps) {
  const [expanded, setExpanded] = useState(false);
  const parsedEvidence = evidence ? JSON.parse(evidence) : null;
  const statusConfig = STATUS_LABELS[status] ?? STATUS_LABELS.open;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle
              className={`h-5 w-5 ${
                severity === "critical"
                  ? "text-red-500"
                  : severity === "high"
                    ? "text-orange-500"
                    : severity === "medium"
                      ? "text-yellow-500"
                      : "text-blue-500"
              }`}
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base leading-tight">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Badge variant="outline" className={SEVERITY_COLORS[severity]}>
            {severity}
          </Badge>
          <Badge variant="outline" className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {provider}
          </Badge>
          <span>{type.replace(/_/g, " ")}</span>
        </div>

        {parsedEvidence && (
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
              Evidence
            </button>
            {expanded && (
              <div className="mt-2 rounded-md bg-muted p-3 font-mono text-xs space-y-1">
                {parsedEvidence.repo && (
                  <div>
                    <span className="text-muted-foreground">Repo: </span>
                    {parsedEvidence.repo}
                  </div>
                )}
                {parsedEvidence.file && (
                  <div>
                    <span className="text-muted-foreground">File: </span>
                    {parsedEvidence.file}
                    {parsedEvidence.line && `:${parsedEvidence.line}`}
                  </div>
                )}
                {parsedEvidence.snippet && (
                  <div className="mt-1 rounded bg-background p-2 overflow-x-auto">
                    {parsedEvidence.snippet}
                  </div>
                )}
                {parsedEvidence.email && (
                  <div>
                    <span className="text-muted-foreground">
                      Forwarding to:{" "}
                    </span>
                    {parsedEvidence.email}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {recommended_action && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Recommended: </span>
            {recommended_action}
          </p>
        )}

        {status === "open" && onRemediate && (
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
            onClick={() => onRemediate(id)}
          >
            <Shield className="mr-2 h-3 w-3" />
            Request Protective Action
          </Button>
        )}

        {status === "remediated" && (
          <div className="flex items-center gap-2 text-xs text-emerald-500">
            <Shield className="h-3 w-3" />
            Remediated — access reverted to read-only
          </div>
        )}
      </CardContent>
    </Card>
  );
}
