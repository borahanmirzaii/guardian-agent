import { getUser } from "@/lib/auth0";
import { getDashboardStats } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Scan, Clock } from "lucide-react";
import { RiskScore } from "@/components/risk-score";
import { ScanButton } from "@/components/scan-button";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;

  const stats = getDashboardStats(user.sub as string);
  const riskScore = calculateRiskScore(stats);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Overview</h1>
          <p className="text-sm text-muted-foreground">
            Guardian monitors your connected accounts with read-only access
          </p>
        </div>
        <ScanButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <RiskScore score={riskScore} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Threats
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFindings}</div>
            <div className="flex gap-2 mt-2">
              {stats.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.critical} Critical
                </Badge>
              )}
              {stats.high > 0 && (
                <Badge className="bg-orange-500/10 text-orange-500 text-xs">
                  {stats.high} High
                </Badge>
              )}
              {stats.medium > 0 && (
                <Badge className="bg-yellow-500/10 text-yellow-500 text-xs">
                  {stats.medium} Medium
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Level</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">
                Read-Only
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              All tokens are read-only scoped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stats.lastScanAt ?? "No scans yet"}
            </div>
            {stats.lastScanStatus && (
              <Badge variant="outline" className="mt-2 text-xs">
                {stats.lastScanStatus}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function calculateRiskScore(stats: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}): number {
  const score =
    100 -
    stats.critical * 30 -
    stats.high * 15 -
    stats.medium * 5 -
    (stats.low ?? 0) * 2;
  return Math.max(0, Math.min(100, score));
}
