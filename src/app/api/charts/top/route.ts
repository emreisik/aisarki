import { NextRequest, NextResponse } from "next/server";
import { getTopSongs } from "@/lib/taskStore";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("limit") ?? 50)),
  );
  const songs = await getTopSongs(limit);
  return NextResponse.json({ songs });
}
