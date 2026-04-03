"use client";

import { Shield, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScopeBadgeProps {
  elevated?: boolean;
  countdown?: number;
}

export function ScopeBadge({ elevated, countdown }: ScopeBadgeProps) {
  if (elevated) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/50 bg-amber-500/10 text-amber-500 gap-1.5"
      >
        <ShieldAlert className="h-3 w-3" />
        Elevated Access
        {countdown !== undefined && (
          <span className="font-mono">({countdown}s)</span>
        )}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500 gap-1.5"
    >
      <Shield className="h-3 w-3" />
      Read-Only
    </Badge>
  );
}
