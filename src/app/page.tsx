import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { Shield, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await auth0.getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Guardian Agent</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          AI security copilot that monitors your accounts with read-only access
          and acts only with your permission.
        </p>
      </div>

      <div className="flex gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-emerald-500" />
          <span>Read-only by default</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-500" />
          <span>Write-only with approval</span>
        </div>
      </div>

      <a href="/auth/login?returnTo=/dashboard">
        <Button size="lg" className="text-base">
          Sign in with Auth0
        </Button>
      </a>
    </div>
  );
}
