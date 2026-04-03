"use client";

import { ScopeBadge } from "@/components/scope-badge";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: {
    name?: string;
    email?: string;
    picture?: string;
    [key: string]: unknown;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <ScopeBadge />

      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-muted-foreground">
            {user.name || user.email}
          </span>
        </div>
        {user.picture && (
          <img
            src={user.picture}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        )}
        <a href="/auth/logout">
          <Button variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </header>
  );
}
