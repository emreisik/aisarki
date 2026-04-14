import { NextResponse } from "next/server";
import { getAllSongs, getProcessingTasks } from "@/lib/taskStore";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ songs: [], processing: [] });
    }

    const userId = session.user.id;
    const [songs, processing] = await Promise.all([
      getAllSongs(userId),
      getProcessingTasks(userId),
    ]);
    return NextResponse.json({ songs, processing });
  } catch (e) {
    console.error("[all-songs] hata:", e);
    return NextResponse.json(
      { error: String(e), songs: [], processing: [] },
      { status: 500 },
    );
  }
}
