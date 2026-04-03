"use client";

import { Shield, ShieldAlert } from "lucide-react";

interface ReadOnlyBannerProps {
  elevated?: boolean;
  countdown?: number;
}

export function ReadOnlyBanner({ elevated, countdown }: ReadOnlyBannerProps) {
  if (elevated) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-500">
        <ShieldAlert className="h-4 w-4" />
        <span className="font-medium">
          Elevated Access — {countdown}s remaining
        </span>
        <span className="text-amber-500/70">
          Write token active, will auto-expire
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-500">
      <Shield className="h-4 w-4" />
      <span>
        Read-only by default — Guardian monitors with minimal permissions
      </span>
    </div>
  );
}
