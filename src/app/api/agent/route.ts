import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth0";
import { runGuardianAgent } from "@/lib/agent/guardian";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();
  const userId = user.sub as string;
  const result = runGuardianAgent(userId, messages);

  return result.toUIMessageStreamResponse();
}
