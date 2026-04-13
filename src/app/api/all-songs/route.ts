import { NextResponse } from "next/server";
import { getAllSongs } from "@/lib/taskStore";

export async function GET() {
  const songs = await getAllSongs();
  return NextResponse.json({ songs });
}
