import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLikedSongIds } from "@/lib/taskStore";

/** GET /api/likes/ids — kullanıcının beğendiği song id'lerinin set'i (hızlı bulk check) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }
    const ids = await getLikedSongIds(session.user.id);
    return NextResponse.json({ ids: Array.from(ids) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[likes/ids][GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
