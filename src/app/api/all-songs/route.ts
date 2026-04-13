import { NextResponse } from "next/server";
import { getAllSongs } from "@/lib/taskStore";

export async function GET() {
  const songs = getAllSongs();
  return NextResponse.json({ songs });
}
