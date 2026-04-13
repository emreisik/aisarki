import { NextResponse } from "next/server";
import { getAllSongs } from "@/lib/taskStore";
import fs from "fs";
import path from "path";

export async function POST() {
  const songs = getAllSongs();
  const file = path.join(process.cwd(), "data", "songs.json");
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(songs, null, 2), "utf-8");
  return NextResponse.json({ ok: true, count: songs.length });
}
