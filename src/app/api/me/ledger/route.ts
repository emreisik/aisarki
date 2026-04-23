import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecentLedger } from "@/lib/credits";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
  try {
    const entries = await getRecentLedger(session.user.id, limit);
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("[me/ledger] hata:", e);
    return NextResponse.json({ error: "Ledger alınamadı" }, { status: 500 });
  }
}
