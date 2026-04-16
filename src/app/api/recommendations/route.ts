import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecommendations } from "@/lib/taskStore";

export const revalidate = 0;

/** Login varsa kişiselleştirilmiş öneriler, yoksa popüler top chart fallback. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(50, Number(url.searchParams.get("limit") ?? 20)),
  );

  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const songs = await getRecommendations(userId, limit);
    return NextResponse.json({ songs, personalized: userId != null });
  } catch (e) {
    console.error("[recommendations] hata:", e);
    return NextResponse.json({ songs: [], personalized: false });
  }
}
