import webpush from "web-push";
import sql from "@/lib/db";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export type PushSegment = "all" | "free" | "pro" | "premier";

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const email = process.env.VAPID_EMAIL;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!email || !pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  vapidReady = true;
  return true;
}

export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_EMAIL &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushSubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

async function fetchSubscriptions(segment: PushSegment): Promise<PushSubRow[]> {
  try {
    if (segment === "all") {
      return (await sql`
        SELECT DISTINCT ON (endpoint) endpoint, p256dh, auth, user_id
        FROM push_subscriptions
      `) as PushSubRow[];
    }
    return (await sql`
      SELECT DISTINCT ON (ps.endpoint) ps.endpoint, ps.p256dh, ps.auth, ps.user_id
      FROM push_subscriptions ps
      JOIN users u ON u.id::text = ps.user_id
      WHERE u.plan_id = ${segment} AND (u.banned_at IS NULL)
    `) as PushSubRow[];
  } catch (err) {
    // Tablo henüz yoksa (kimse abone olmamış ve migration eksik) 0 dön
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist/i.test(msg)) return [];
    throw err;
  }
}

/**
 * Hedef kitle boyutu (broadcast'ı göndermeden önce UI'da göstermek için).
 */
export async function countTargets(segment: PushSegment): Promise<number> {
  const rows = (await fetchSubscriptions(segment)) as PushSubRow[];
  return rows.length;
}

export interface BroadcastResult {
  targetCount: number;
  sentCount: number;
  failedCount: number;
  expiredRemoved: number;
}

export async function sendBroadcast(
  payload: PushPayload,
  segment: PushSegment,
): Promise<BroadcastResult> {
  if (!ensureVapid()) {
    throw new Error(
      "VAPID env'leri eksik: VAPID_EMAIL / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY",
    );
  }

  const subs = await fetchSubscriptions(segment);
  if (subs.length === 0) {
    return {
      targetCount: 0,
      sentCount: 0,
      failedCount: 0,
      expiredRemoved: 0,
    };
  }

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      ),
    ),
  );

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sent++;
    } else {
      failed++;
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 410 || code === 404) {
        expired.push(subs[i].endpoint);
      }
    }
  });

  if (expired.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${expired}::text[])`;
  }

  return {
    targetCount: subs.length,
    sentCount: sent,
    failedCount: failed,
    expiredRemoved: expired.length,
  };
}

export interface PushCampaignRow {
  id: string;
  adminId: string;
  adminEmail: string | null;
  title: string;
  body: string;
  url: string | null;
  segmentPlan: string | null;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export async function recentCampaigns(limit = 20): Promise<PushCampaignRow[]> {
  const rows = (await sql`
    SELECT id, admin_id, admin_email, title, body, url, segment_plan,
           target_count, sent_count, failed_count, status, error,
           started_at, finished_at
    FROM push_campaigns
    ORDER BY started_at DESC
    LIMIT ${limit}
  `) as {
    id: string;
    admin_id: string;
    admin_email: string | null;
    title: string;
    body: string;
    url: string | null;
    segment_plan: string | null;
    target_count: number;
    sent_count: number;
    failed_count: number;
    status: string;
    error: string | null;
    started_at: string;
    finished_at: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    adminId: r.admin_id,
    adminEmail: r.admin_email,
    title: r.title,
    body: r.body,
    url: r.url,
    segmentPlan: r.segment_plan,
    targetCount: r.target_count,
    sentCount: r.sent_count,
    failedCount: r.failed_count,
    status: r.status,
    error: r.error,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  }));
}
