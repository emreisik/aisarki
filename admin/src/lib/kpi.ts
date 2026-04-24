import sql from "@/lib/db";
import { PLAN_DEFINITIONS, type PlanId } from "@shared/lib/plans";

export interface MetricValue {
  value: number;
  // yüzde değişim (önceki aynı periyoda göre); null ise karşılaştırma yapılamıyor
  deltaPct: number | null;
}

export interface KpiSnapshot {
  users: {
    total: MetricValue;
    dau: MetricValue;
    mau: MetricValue;
    signups7d: MetricValue;
  };
  revenue: {
    mrrUsd: MetricValue; // cent cinsinden; UI'da /100 ile gösterilir
    arrUsd: MetricValue;
    freeCount: MetricValue;
    paidCount: MetricValue;
  };
  generation: {
    songs24h: MetricValue;
    successRatePct: MetricValue;
    failed24h: MetricValue;
    avgDurationSec: MetricValue;
  };
  infra: {
    songsInBunny: MetricValue;
    songsSunoOnly: MetricValue;
    songsBroken: MetricValue;
    imagesInBunny: MetricValue;
  };
}

function deltaPct(
  current: number,
  previous: number | null | undefined,
): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function getKpiSnapshot(): Promise<KpiSnapshot> {
  // Tek sorguda birden fazla metrik — her değer ayrı CTE/subquery.
  const u = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total,
      (SELECT COUNT(DISTINCT user_id)::int FROM song_plays
         WHERE played_at >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL) AS dau,
      (SELECT COUNT(DISTINCT user_id)::int FROM song_plays
         WHERE played_at >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL) AS mau,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS signups_7d,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') AS signups_prev_7d,
      (SELECT COUNT(DISTINCT user_id)::int FROM song_plays
         WHERE played_at >= NOW() - INTERVAL '2 days' AND played_at < NOW() - INTERVAL '1 day' AND user_id IS NOT NULL) AS dau_prev
  `) as {
    total: number;
    dau: number;
    mau: number;
    signups_7d: number;
    signups_prev_7d: number;
    dau_prev: number;
  }[];

  const planCounts = (await sql`
    SELECT plan_id, COUNT(*)::int AS cnt, billing_period
    FROM subscriptions
    WHERE status IN ('active', 'trialing')
    GROUP BY plan_id, billing_period
  `) as { plan_id: string; cnt: number; billing_period: string }[];

  let mrrCents = 0;
  let paidCount = 0;
  for (const p of planCounts) {
    const def = PLAN_DEFINITIONS[p.plan_id as PlanId];
    if (!def || def.priceMonthlyUsd === 0) continue;
    const monthly =
      p.billing_period === "yearly"
        ? Math.round(def.priceYearlyUsd / 12)
        : def.priceMonthlyUsd;
    mrrCents += monthly * p.cnt;
    paidCount += p.cnt;
  }
  const arrCents = mrrCents * 12;

  const freeCount = (await sql`
    SELECT COUNT(*)::int AS cnt FROM users
    WHERE plan_id = 'free' OR plan_id IS NULL
  `) as { cnt: number }[];

  // Generation stats: tasks tablosu üzerinden
  const g = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM tasks
         WHERE created_at >= NOW() - INTERVAL '1 day' AND status = 'complete') AS done_24h,
      (SELECT COUNT(*)::int FROM tasks
         WHERE created_at >= NOW() - INTERVAL '1 day' AND status = 'failed') AS failed_24h,
      (SELECT COUNT(*)::int FROM tasks
         WHERE created_at >= NOW() - INTERVAL '1 day') AS total_24h,
      (SELECT COUNT(*)::int FROM tasks
         WHERE created_at >= NOW() - INTERVAL '2 days' AND created_at < NOW() - INTERVAL '1 day' AND status = 'complete') AS done_prev_24h,
      (SELECT ROUND(AVG(duration)::numeric, 1) FROM songs
         WHERE status = 'complete' AND created_at >= NOW() - INTERVAL '1 day' AND duration IS NOT NULL) AS avg_dur
  `) as {
    done_24h: number;
    failed_24h: number;
    total_24h: number;
    done_prev_24h: number;
    avg_dur: number | null;
  }[];

  const total24h = g[0].total_24h;
  const successRate = total24h > 0 ? (g[0].done_24h / total24h) * 100 : 0;

  // Infra (DB'den türetilebilenler)
  const i = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE audio_key IS NOT NULL)::int AS bunny_audio,
      COUNT(*) FILTER (WHERE audio_key IS NULL AND audio_url IS NOT NULL AND audio_url != '')::int AS suno_only,
      COUNT(*) FILTER (WHERE audio_key IS NULL AND (audio_url IS NULL OR audio_url = ''))::int AS broken,
      COUNT(*) FILTER (WHERE image_key IS NOT NULL)::int AS bunny_image
    FROM songs
  `) as {
    bunny_audio: number;
    suno_only: number;
    broken: number;
    bunny_image: number;
  }[];

  return {
    users: {
      total: { value: u[0].total, deltaPct: null },
      dau: { value: u[0].dau, deltaPct: deltaPct(u[0].dau, u[0].dau_prev) },
      mau: { value: u[0].mau, deltaPct: null },
      signups7d: {
        value: u[0].signups_7d,
        deltaPct: deltaPct(u[0].signups_7d, u[0].signups_prev_7d),
      },
    },
    revenue: {
      mrrUsd: { value: mrrCents, deltaPct: null },
      arrUsd: { value: arrCents, deltaPct: null },
      freeCount: { value: freeCount[0]?.cnt ?? 0, deltaPct: null },
      paidCount: { value: paidCount, deltaPct: null },
    },
    generation: {
      songs24h: {
        value: g[0].done_24h,
        deltaPct: deltaPct(g[0].done_24h, g[0].done_prev_24h),
      },
      successRatePct: { value: Math.round(successRate), deltaPct: null },
      failed24h: { value: g[0].failed_24h, deltaPct: null },
      avgDurationSec: { value: Number(g[0].avg_dur ?? 0), deltaPct: null },
    },
    infra: {
      songsInBunny: { value: i[0].bunny_audio, deltaPct: null },
      songsSunoOnly: { value: i[0].suno_only, deltaPct: null },
      songsBroken: { value: i[0].broken, deltaPct: null },
      imagesInBunny: { value: i[0].bunny_image, deltaPct: null },
    },
  };
}
