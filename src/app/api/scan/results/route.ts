import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth0";
import { getFindingsForUser } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const findings = getFindingsForUser(user.sub as string, status);

  return NextResponse.json({ findings });
}
