import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth0";
import { getAuditEntries } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category =
    request.nextUrl.searchParams.get("category") ?? undefined;
  const limit = parseInt(
    request.nextUrl.searchParams.get("limit") ?? "50",
    10
  );
  const offset = parseInt(
    request.nextUrl.searchParams.get("offset") ?? "0",
    10
  );

  const entries = getAuditEntries(user.sub as string, {
    category,
    limit,
    offset,
  });

  return NextResponse.json({ entries });
}
