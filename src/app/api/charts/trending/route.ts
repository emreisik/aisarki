import { NextRequest, NextResponse } from "next/server";
import { getTrendingSongs } from "@/lib/taskStore";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Math.max(
    1,
    Math.min(30, Number(url.searchParams.get("days") ?? 7)),
  );
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("limit") ?? 50)),
  );
  const songs = await getTrendingSongs(days, limit);
  return NextResponse.json({ songs });
}
