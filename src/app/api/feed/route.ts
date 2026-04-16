import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFollowFeed } from "@/lib/taskStore";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ songs: [] }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("limit") ?? 20)),
  );
  const songs = await getFollowFeed(session.user.id, limit);
  return NextResponse.json({ songs });
}
