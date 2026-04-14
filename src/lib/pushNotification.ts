import webpush from "web-push";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const email = process.env.VAPID_EMAIL;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!email || !pub || !priv) return;
  webpush.setVapidDetails(email, pub, priv);
  vapidReady = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureVapid();
  if (!vapidReady) return;
  let rows: { endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    const result = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `;
    rows = result as { endpoint: string; p256dh: string; auth: string }[];
  } catch {
    return;
  }

  const results = await Promise.allSettled(
    rows.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      ),
    ),
  );

  // Geçersiz subscription'ları temizle (410 Gone)
  const expired = rows.filter((_, i) => {
    const r = results[i];
    return (
      r.status === "rejected" &&
      (r.reason as { statusCode?: number })?.statusCode === 410
    );
  });

  if (expired.length > 0) {
    await Promise.allSettled(
      expired.map(
        (sub) =>
          sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`,
      ),
    );
  }
}
