import { NextRequest, NextResponse } from "next/server";
import { getSongById } from "@/lib/taskStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const song = await getSongById(id);
  if (!song) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ song });
}
