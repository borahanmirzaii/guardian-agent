import { getUser } from "@/lib/auth0";
import { AgentChat } from "@/components/agent-chat";

export default async function AgentPage() {
  const user = await getUser();
  if (!user) return null;

  return (
    <div className="h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Guardian Agent</h1>
        <p className="text-sm text-muted-foreground">
          Chat with your AI security copilot — it can scan, analyze, and
          remediate with your approval
        </p>
      </div>
      <AgentChat />
    </div>
  );
}
