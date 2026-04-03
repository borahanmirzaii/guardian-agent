import { getUser } from "@/lib/auth0";
import { getAuditEntries } from "@/lib/audit";
import { AuditTimeline } from "@/components/audit-timeline";
import { ScrollText } from "lucide-react";

export default async function AuditPage() {
  const user = await getUser();
  if (!user) return null;

  const allEntries = getAuditEntries(user.sub as string, { limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Complete chain of all Guardian actions — detected, approved, executed,
          expired
        </p>
      </div>

      {allEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium">No audit events yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Run a scan to start generating audit events
          </p>
        </div>
      ) : (
        <AuditTimeline entries={allEntries} />
      )}
    </div>
  );
}
