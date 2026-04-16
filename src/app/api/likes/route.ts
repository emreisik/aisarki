import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleLike, getLikedSongs } from "@/lib/taskStore";

/** POST /api/likes  body: { songId } — toggle like */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { songId?: string };
    const songId = body.songId?.trim();
    if (!songId) {
      return NextResponse.json({ error: "songId zorunludur" }, { status: 400 });
    }

    const result = await toggleLike(session.user.id, songId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[likes][POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** GET /api/likes — beğenilen şarkıların tam listesi (liked_at DESC) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }
    const songs = await getLikedSongs(session.user.id);
    return NextResponse.json({ songs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[likes][GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
