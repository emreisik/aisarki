"use server";

import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/requireRole";
import { sendBroadcast, type PushSegment } from "@/lib/push";

export interface SendResult {
  ok: boolean;
  error?: string;
  campaignId?: string;
  targetCount?: number;
  sentCount?: number;
  failedCount?: number;
}

export async function sendCampaignAction(input: {
  title: string;
  body: string;
  url?: string;
  segment: PushSegment;
}): Promise<SendResult> {
  const session = await requireRole("admin");

  const title = input.title.trim();
  const body = input.body.trim();
  const url = input.url?.trim() || null;
  const segment = input.segment;

  if (!title || !body) {
    return { ok: false, error: "Başlık ve mesaj gerekli." };
  }
  if (title.length > 60) {
    return { ok: false, error: "Başlık 60 karakteri geçemez." };
  }
  if (body.length > 200) {
    return { ok: false, error: "Mesaj 200 karakteri geçemez." };
  }
  if (!["all", "free", "pro", "premier"].includes(segment)) {
    return { ok: false, error: "Geçersiz segment." };
  }

  // Kampanya kaydı — önce running
  const insertRows = (await sql`
    INSERT INTO push_campaigns (admin_id, admin_email, title, body, url, segment_plan, status)
    VALUES (${session.user.id}, ${session.user.email ?? null},
            ${title}, ${body}, ${url}, ${segment}, 'running')
    RETURNING id
  `) as { id: string }[];
  const campaignId = insertRows[0].id;

  try {
    const res = await sendBroadcast(
      { title, body, url: url ?? undefined },
      segment,
    );

    await sql`
      UPDATE push_campaigns
      SET target_count = ${res.targetCount},
          sent_count   = ${res.sentCount},
          failed_count = ${res.failedCount},
          status       = 'sent',
          finished_at  = NOW()
      WHERE id = ${campaignId}
    `;

    await logAudit({
      adminId: session.user.id,
      adminEmail: session.user.email ?? null,
      action: "push.campaign.sent",
      targetType: "campaign",
      targetId: campaignId,
      payload: {
        title,
        body,
        url,
        segment,
        target: res.targetCount,
        sent: res.sentCount,
        failed: res.failedCount,
        expired: res.expiredRemoved,
      },
    });

    revalidatePath("/push");
    return {
      ok: true,
      campaignId,
      targetCount: res.targetCount,
      sentCount: res.sentCount,
      failedCount: res.failedCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sql`
      UPDATE push_campaigns
      SET status = 'error', error = ${msg}, finished_at = NOW()
      WHERE id = ${campaignId}
    `;
    await logAudit({
      adminId: session.user.id,
      adminEmail: session.user.email ?? null,
      action: "push.campaign.error",
      targetType: "campaign",
      targetId: campaignId,
      payload: { title, segment, error: msg },
    });
    return { ok: false, error: msg };
  }
}

export async function getSegmentCount(segment: PushSegment): Promise<number> {
  await requireRole("admin");
  const { countTargets } = await import("@/lib/push");
  return countTargets(segment);
}
