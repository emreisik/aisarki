import { NextRequest, NextResponse } from "next/server";
import { getRemixesInspiredByUser } from "@/lib/taskStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : 50;
    const items = await getRemixesInspiredByUser(userId, limit);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[remixes-inspired]", e);
    return NextResponse.json(
      { error: "Liste alınamadı", items: [] },
      { status: 500 },
    );
  }
}
