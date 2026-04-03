"use client";

import { GitBranch, Mail, Link2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScopeBadge } from "@/components/scope-badge";

interface ConnectionCardProps {
  provider: "github" | "google";
  connected: boolean;
  scopes?: string[];
}

const PROVIDER_CONFIG = {
  github: {
    name: "GitHub",
    icon: GitBranch,
    description: "Scan repositories for exposed secrets and suspicious app installations",
    scopes: ["repo (read)", "read:user", "read:org"],
    connectUrl: "/auth/login?connection=github&returnTo=/dashboard/connections",
  },
  google: {
    name: "Google",
    icon: Mail,
    description: "Check Gmail for suspicious forwarding rules and account settings",
    scopes: ["gmail.readonly", "gmail.settings.basic"],
    connectUrl: "/auth/login?connection=google-oauth2&returnTo=/dashboard/connections",
  },
};

export function ConnectionCard({
  provider,
  connected,
  scopes,
}: ConnectionCardProps) {
  const config = PROVIDER_CONFIG[provider];
  const Icon = config.icon;
  const displayScopes = scopes ?? config.scopes;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{config.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
          </div>
        </div>
        {connected ? (
          <ScopeBadge />
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Not Connected
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {displayScopes.map((scope) => (
              <Badge
                key={scope}
                variant="secondary"
                className="text-xs font-mono"
              >
                {scope}
              </Badge>
            ))}
          </div>
          {!connected && (
            <a href={config.connectUrl}>
              <Button variant="outline" size="sm">
                <Link2 className="mr-2 h-3 w-3" />
                Connect
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
