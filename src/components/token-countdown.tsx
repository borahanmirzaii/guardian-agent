"use client";

import { useEffect, useState } from "react";
import { ScopeBadge } from "./scope-badge";

interface TokenCountdownProps {
  ttl: number;
  onExpire?: () => void;
}

export function TokenCountdown({ ttl, onExpire }: TokenCountdownProps) {
  const [remaining, setRemaining] = useState(ttl);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  if (remaining <= 0) {
    return <ScopeBadge />;
  }

  return <ScopeBadge elevated countdown={remaining} />;
}
