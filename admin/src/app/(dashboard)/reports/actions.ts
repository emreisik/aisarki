"use server";

import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/requireRole";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function fetchGroupReportIds(
  targetType: string,
  targetId: string,
): Promise<string[]> {
  const rows = (await sql`
    SELECT id FROM reports
    WHERE target_type = ${targetType}
      AND target_id = ${targetId}
      AND status = 'open'
  `) as { id: string }[];
  return rows.map((r) => r.id);
}

/**
 * Bir target'a ait tüm open raporları "dismissed" olarak işaretler.
 */
export async function dismissGroupAction(
  targetType: string,
  targetId: string,
  note: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");
  const ids = await fetchGroupReportIds(targetType, targetId);
  if (ids.length === 0) {
    return { ok: false, error: "Açık rapor bulunamadı." };
  }

  await sql`
    UPDATE reports SET status = 'dismissed'
    WHERE id = ANY(${ids}::text[])
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "report.dismiss",
    targetType,
    targetId,
    payload: { report_ids: ids, count: ids.length, note },
  });

  revalidatePath("/reports");
  return { ok: true };
}

/**
 * Song'u takedown eder + ilgili tüm open raporları "actioned" yapar.
 */
export async function takedownFromReportAction(
  targetId: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");

  const songRows = (await sql`
    SELECT id, title, created_by, takedown_at FROM songs WHERE id = ${targetId}
  `) as {
    id: string;
    title: string;
    created_by: string | null;
    takedown_at: string | null;
  }[];
  const song = songRows[0];
  if (!song) return { ok: false, error: "Şarkı bulunamadı." };

  const alreadyTakenDown = !!song.takedown_at;
  if (!alreadyTakenDown) {
    await sql`
      UPDATE songs SET takedown_at = NOW(), takedown_reason = ${reason || null}
      WHERE id = ${targetId}
    `;
    await logAudit({
      adminId: session.user.id,
      adminEmail: session.user.email ?? null,
      action: "song.takedown",
      targetType: "song",
      targetId,
      before: { takedown_at: null },
      after: { takedown_at: new Date().toISOString(), takedown_reason: reason },
      payload: { title: song.title, source: "reports", reason },
    });
  }

  const ids = await fetchGroupReportIds("song", targetId);
  if (ids.length > 0) {
    await sql`
      UPDATE reports SET status = 'actioned'
      WHERE id = ANY(${ids}::text[])
    `;
    await logAudit({
      adminId: session.user.id,
      adminEmail: session.user.email ?? null,
      action: "report.actioned",
      targetType: "song",
      targetId,
      payload: { report_ids: ids, count: ids.length, action: "takedown" },
    });
  }

  revalidatePath("/reports");
  revalidatePath("/songs");
  return { ok: true };
}

/**
 * Reporter'ı banlar (spam raporlayan için). Raporlarını dismiss eder.
 * Self-ban / admin-ban koruması var.
 */
export async function banReporterAction(
  reporterId: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");

  const userRows = (await sql`
    SELECT id, email, role, banned_at FROM users WHERE id::text = ${reporterId}
  `) as {
    id: string;
    email: string;
    role: string;
    banned_at: string | null;
  }[];
  const u = userRows[0];
  if (!u) return { ok: false, error: "Kullanıcı bulunamadı." };
  if (u.id === session.user.id) {
    return { ok: false, error: "Kendini banlayamazsın." };
  }
  if (u.role !== "user") {
    return { ok: false, error: "Admin rolündeki kullanıcı banlanamaz." };
  }

  if (!u.banned_at) {
    await sql`
      UPDATE users SET banned_at = NOW(), banned_reason = ${reason || null}
      WHERE id::text = ${reporterId}
    `;
    await logAudit({
      adminId: session.user.id,
      adminEmail: session.user.email ?? null,
      action: "user.ban",
      targetType: "user",
      targetId: reporterId,
      before: { banned_at: null },
      after: { banned_at: new Date().toISOString(), banned_reason: reason },
      payload: { source: "reports", reason },
    });
  }

  // Bu kullanıcının tüm açık raporlarını dismiss et
  await sql`
    UPDATE reports SET status = 'dismissed'
    WHERE reporter_id = ${reporterId} AND status = 'open'
  `;

  revalidatePath("/reports");
  revalidatePath("/users");
  return { ok: true };
}
