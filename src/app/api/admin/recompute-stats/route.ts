import { NextRequest, NextResponse } from "next/server";
import { recomputeStats } from "@/lib/taskStore";

export const maxDuration = 60;

/** Cron endpoint — günde 1 kez çalışır.
 *  users.monthly_listeners (28 gün unique) ve songs.play_count_7d denormalize eder.
 *  Auth: ADMIN_HEAL_TOKEN bearer. */
async function handle(req: NextRequest) {
  const expected = process.env.ADMIN_HEAL_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_HEAL_TOKEN not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const urlToken = new URL(req.url).searchParams.get("token") ?? "";
  if (token !== expected && urlToken !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeStats();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[recompute-stats] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
