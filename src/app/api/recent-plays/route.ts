import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentPlays } from "@/lib/taskStore";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** Oturum açmış kullanıcının son dinlediklerini döner. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json({ songs: [] });
    }

    const url = new URL(req.url);
    const limit = Math.max(
      1,
      Math.min(50, Number(url.searchParams.get("limit") ?? 20)),
    );

    const songs = await getRecentPlays(userId, limit);
    return NextResponse.json({ songs });
  } catch (e) {
    console.error("[recent-plays] error:", e);
    return NextResponse.json({ songs: [] });
  }
}
