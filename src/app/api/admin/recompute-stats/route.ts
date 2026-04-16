import { NextRequest, NextResponse } from "next/server";
import { recomputeStats } from "@/lib/taskStore";
import { checkAdminToken } from "@/lib/adminAuth";

export const maxDuration = 60;

/** Cron endpoint — günde 1 kez çalışır.
 *  users.monthly_listeners (28 gün unique) ve songs.play_count_7d denormalize eder.
 *  Auth: Authorization: Bearer <ADMIN_HEAL_TOKEN>  (query param kabul edilmez) */
async function handle(req: NextRequest) {
  const authz = checkAdminToken(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
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
