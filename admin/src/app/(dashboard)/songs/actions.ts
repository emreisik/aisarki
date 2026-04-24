"use server";

import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/requireRole";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function fetchSong(songId: string) {
  const rows = (await sql`
    SELECT id, title, status, takedown_at, takedown_reason, created_by
    FROM songs WHERE id = ${songId} LIMIT 1
  `) as {
    id: string;
    title: string;
    status: string;
    takedown_at: string | null;
    takedown_reason: string | null;
    created_by: string | null;
  }[];
  return rows[0] ?? null;
}

export async function takedownSongAction(
  songId: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");
  const target = await fetchSong(songId);
  if (!target) return { ok: false, error: "Şarkı bulunamadı." };
  if (target.takedown_at)
    return { ok: false, error: "Zaten takedown edilmiş." };

  await sql`
    UPDATE songs
    SET takedown_at = NOW(), takedown_reason = ${reason || null}
    WHERE id = ${songId}
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "song.takedown",
    targetType: "song",
    targetId: songId,
    before: { takedown_at: null, takedown_reason: null },
    after: {
      takedown_at: new Date().toISOString(),
      takedown_reason: reason || null,
    },
    payload: { title: target.title, creator_id: target.created_by, reason },
  });

  revalidatePath("/songs");
  return { ok: true };
}

export async function restoreSongAction(songId: string): Promise<ActionResult> {
  const session = await requireRole("admin");
  const target = await fetchSong(songId);
  if (!target) return { ok: false, error: "Şarkı bulunamadı." };
  if (!target.takedown_at) return { ok: false, error: "Takedown edilmemiş." };

  await sql`
    UPDATE songs SET takedown_at = NULL, takedown_reason = NULL
    WHERE id = ${songId}
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "song.restore",
    targetType: "song",
    targetId: songId,
    before: {
      takedown_at: target.takedown_at,
      takedown_reason: target.takedown_reason,
    },
    after: { takedown_at: null, takedown_reason: null },
    payload: { title: target.title, creator_id: target.created_by },
  });

  revalidatePath("/songs");
  return { ok: true };
}
