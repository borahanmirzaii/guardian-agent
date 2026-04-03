import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth0";
import { getDashboardStats } from "@/lib/db";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = getDashboardStats(user.sub as string);
  return NextResponse.json(stats);
}
