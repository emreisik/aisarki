import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordPlay } from "@/lib/taskStore";

export const maxDuration = 10;

/** Client 30sn+ dinleyince çağırır. Dedup ve stream sayımı server-side. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const songId = typeof body?.songId === "string" ? body.songId : null;
    const durationListened = Number(body?.durationListened ?? 0);
    const sessionId =
      typeof body?.sessionId === "string" ? body.sessionId.slice(0, 64) : null;

    if (!songId || !Number.isFinite(durationListened)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Login'siz ve session_id yoksa atla
    if (!userId && !sessionId) {
      return NextResponse.json({ counted: false, playCount: 0 });
    }

    const result = await recordPlay({
      songId,
      userId,
      sessionId,
      durationListened: Math.floor(durationListened),
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[plays] record error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
