import { NextRequest, NextResponse } from "next/server";
import { getSimilarSongs } from "@/lib/taskStore";

export const revalidate = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const limit = Math.max(
    1,
    Math.min(50, Number(new URL(req.url).searchParams.get("limit") ?? 8)),
  );
  const songs = await getSimilarSongs(id, limit);
  return NextResponse.json({ songs });
}
