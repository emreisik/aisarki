import { NextResponse } from "next/server";
import { getAllSongs, getProcessingTasks } from "@/lib/taskStore";

export async function GET() {
  const [songs, processing] = await Promise.all([
    getAllSongs(),
    getProcessingTasks(),
  ]);
  return NextResponse.json({ songs, processing });
}
