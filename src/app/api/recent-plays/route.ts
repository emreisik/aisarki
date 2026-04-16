import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentPlays, getRecentAnonPlays } from "@/lib/taskStore";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** Kullanıcının (veya anonim session'ın) son dinlediklerini döner. */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(
      1,
      Math.min(50, Number(url.searchParams.get("limit") ?? 20)),
    );

    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (userId) {
      const songs = await getRecentPlays(userId, limit);
      return NextResponse.json({ songs });
    }

    const rawSid = req.headers.get("x-session-id");
    const sessionId = rawSid ? rawSid.slice(0, 64).trim() : "";
    if (!sessionId) {
      return NextResponse.json({ songs: [] });
    }

    const songs = await getRecentAnonPlays(sessionId, limit);
    return NextResponse.json({ songs });
  } catch (e) {
    console.error("[recent-plays] error:", e);
    return NextResponse.json({ songs: [] });
  }
}
