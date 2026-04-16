import { NextRequest, NextResponse } from "next/server";
import { getUserStats } from "@/lib/taskStore";

export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stats = await getUserStats(id);
  return NextResponse.json(stats);
}
