import { getUser } from "@/lib/auth0";
import { ConnectionCard } from "@/components/connection-card";
import { Shield } from "lucide-react";

export default async function ConnectionsPage() {
  const user = await getUser();
  if (!user) return null;

  // In a real implementation, check Token Vault for active connections
  // For now, show both as available to connect
  const connections = {
    github: false,
    google: false,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connected Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Guardian connects with read-only access to monitor your accounts
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-500">
        <Shield className="h-4 w-4" />
        <span>
          Read-only by default — Guardian cannot modify your accounts without
          explicit step-up approval
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ConnectionCard
          provider="github"
          connected={connections.github}
        />
        <ConnectionCard
          provider="google"
          connected={connections.google}
        />
      </div>
    </div>
  );
}
