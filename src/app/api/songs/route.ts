import { NextRequest, NextResponse } from "next/server";
import { getTaskSongs } from "@/lib/taskStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId gereklidir" }, { status: 400 });
  }

  const songs = getTaskSongs(taskId);

  if (!songs) {
    // Still waiting for callback
    return NextResponse.json({ status: "pending", songs: [] });
  }

  return NextResponse.json({ status: "complete", songs });
}
