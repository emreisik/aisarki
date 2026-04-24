import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFollowers } from "@/lib/taskStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const session = await auth();
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : 50;
    const items = await getFollowers(userId, session?.user?.id, limit);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[followers]", e);
    return NextResponse.json(
      { error: "Liste alınamadı", items: [] },
      { status: 500 },
    );
  }
}
