import { NextResponse } from "next/server";
import { getAllSongs, getProcessingTasks } from "@/lib/taskStore";

export async function GET() {
  try {
    const [songs, processing] = await Promise.all([
      getAllSongs(),
      getProcessingTasks(),
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
