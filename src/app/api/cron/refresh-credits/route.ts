import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { ensureSchema } from "@/lib/taskStore";
import { maybeRefreshCredits } from "@/lib/credits";

/**
 * Kredi yenileme cron endpoint'i.
 *
 * Railway cron günde bir POST eder:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/refresh-credits
 *
 * Lazy refresh (checkCanGenerate içinde) zaten çalışır — bu cron offline
 * kalan veya uzun süre üretim yapmayan kullanıcıların kredisini de zamanında
 * yeniler ki UI'da güncel görünsün.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/refresh-credits] CRON_SECRET tanımlı değil");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSchema();
    // next_refresh_at geçmiş olan tüm kullanıcıları bul
    const rows = (await sql`
      SELECT user_id FROM credits
      WHERE next_refresh_at IS NOT NULL
        AND next_refresh_at <= NOW()
      LIMIT 1000
    `) as { user_id: string }[];

    let processed = 0;
    let failed = 0;
    for (const r of rows) {
      try {
        await maybeRefreshCredits(r.user_id);
        processed++;
      } catch (e) {
        failed++;
        console.error(`[cron] user=${r.user_id} refresh failed:`, e);
      }
    }
    return NextResponse.json({
      ok: true,
      scanned: rows.length,
      processed,
      failed,
    });
  } catch (e) {
    console.error("[cron/refresh-credits] hata:", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
