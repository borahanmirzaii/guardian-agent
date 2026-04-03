import { getUser } from "@/lib/auth0";
import { getFindingsForUser } from "@/lib/db";
import { ThreatList } from "./threat-list";
import { ScanButton } from "@/components/scan-button";
import { Shield } from "lucide-react";

export default async function ThreatsPage() {
  const user = await getUser();
  if (!user) return null;

  const findings = getFindingsForUser(user.sub as string);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Threat Detection</h1>
          <p className="text-sm text-muted-foreground">
            Security findings from read-only scans of your connected accounts
          </p>
        </div>
        <ScanButton />
      </div>

      {findings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium">No threats detected</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Click &quot;Scan Now&quot; to check your connected accounts
          </p>
        </div>
      ) : (
        <ThreatList findings={findings} />
      )}
    </div>
  );
}
