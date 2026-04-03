"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, Clock, ArrowRight, Loader2 } from "lucide-react";
import type { Finding } from "@/lib/db";

interface StepUpModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  loading: boolean;
  finding: Finding | null;
}

export function StepUpModal({
  open,
  onClose,
  onApprove,
  loading,
  finding,
}: StepUpModalProps) {
  if (!finding) return null;

  const evidence = finding.evidence ? JSON.parse(finding.evidence) : {};

  const actionDescription =
    finding.provider === "github"
      ? `Create GitHub issue on ${evidence.repo || "repository"} to report the ${finding.type.replace(/_/g, " ")}`
      : `Remove forwarding rule to ${evidence.email || "external address"}`;

  const currentScopes =
    finding.provider === "github"
      ? ["repo:read", "read:user"]
      : ["gmail.readonly"];

  const requestedScopes =
    finding.provider === "github"
      ? ["repo:read", "repo:write", "read:user"]
      : ["gmail.readonly", "gmail.settings.sharing"];

  const newScopes =
    finding.provider === "github"
      ? ["repo:write"]
      : ["gmail.settings.sharing"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <DialogTitle>Step-Up Authorization Required</DialogTitle>
          </div>
          <DialogDescription>
            Guardian needs elevated access to perform a protective action.
            Review the scope changes below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action description */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <span className="font-medium">Action: </span>
            {actionDescription}
          </div>

          {/* Scope comparison */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Scope Escalation</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="text-xs text-muted-foreground">Current (Read-Only)</div>
                <div className="flex flex-wrap gap-1">
                  {currentScopes.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-500 text-xs font-mono"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

              <div className="flex-1 space-y-1.5">
                <div className="text-xs text-muted-foreground">Requested (Elevated)</div>
                <div className="flex flex-wrap gap-1">
                  {requestedScopes.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={`text-xs font-mono ${
                        newScopes.includes(s)
                          ? "border-amber-500/30 text-amber-500 bg-amber-500/5"
                          : "border-emerald-500/30 text-emerald-500"
                      }`}
                    >
                      {s}
                      {newScopes.includes(s) && " ★"}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-500">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Duration: 60 seconds</span>
            <span className="text-amber-500/70">
              — access automatically reverts to read-only
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Deny
          </Button>
          <Button
            onClick={onApprove}
            disabled={loading}
            className="bg-amber-500 text-black hover:bg-amber-400"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            {loading ? "Executing..." : "Approve Step-Up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
