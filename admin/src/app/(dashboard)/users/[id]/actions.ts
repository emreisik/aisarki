"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/requireRole";
import { isAdminRole, hasAtLeast, type UserRole } from "@/lib/roles";
import { grantCredits } from "@shared/lib/credits";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** resetPassword için üretilen plain text şifre (bir kez döner, kaybolursa yeniden reset) */
  newPassword?: string;
}

async function fetchTarget(userId: string) {
  const rows = (await sql`
    SELECT id, email, role, banned_at, banned_reason, plan_id
    FROM users WHERE id::text = ${userId} LIMIT 1
  `) as {
    id: string;
    email: string;
    role: string;
    banned_at: string | null;
    banned_reason: string | null;
    plan_id: string | null;
  }[];
  return rows[0] ?? null;
}

function generateStrongPassword(): string {
  // 16 karakter; harf+rakam+sembol. Admin ekranında gösterilecek.
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = "abcdefghijkmnpqrstuvwxyz";
  const d = "23456789";
  const s = "!@#$%^&*";
  const all = A + a + d + s;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  // İlk 4 karakteri her kategoriden garanti et
  out += A[bytes[0] % A.length];
  out += a[bytes[1] % a.length];
  out += d[bytes[2] % d.length];
  out += s[bytes[3] % s.length];
  for (let i = 4; i < bytes.length; i++) out += all[bytes[i] % all.length];
  return out;
}

// ─── BAN / UNBAN ─────────────────────────────────────────────────────────────

export async function banUserAction(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");
  const target = await fetchTarget(userId);
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };
  if (target.id === session.user.id) {
    return { ok: false, error: "Kendini banlayamazsın." };
  }
  if (isAdminRole(target.role)) {
    return { ok: false, error: "Admin rolündeki kullanıcı banlanamaz." };
  }

  await sql`
    UPDATE users SET banned_at = NOW(), banned_reason = ${reason || null}
    WHERE id::text = ${userId}
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "user.ban",
    targetType: "user",
    targetId: userId,
    before: {
      banned_at: target.banned_at,
      banned_reason: target.banned_reason,
    },
    after: { banned_at: new Date().toISOString(), banned_reason: reason },
    payload: { reason },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return { ok: true };
}

export async function unbanUserAction(userId: string): Promise<ActionResult> {
  const session = await requireRole("admin");
  const target = await fetchTarget(userId);
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };

  await sql`
    UPDATE users SET banned_at = NULL, banned_reason = NULL
    WHERE id::text = ${userId}
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "user.unban",
    targetType: "user",
    targetId: userId,
    before: {
      banned_at: target.banned_at,
      banned_reason: target.banned_reason,
    },
    after: { banned_at: null, banned_reason: null },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return { ok: true };
}

// ─── MANUEL KREDİ ────────────────────────────────────────────────────────────

export async function grantCreditsAction(
  userId: string,
  amount: number,
  note: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Miktar pozitif bir sayı olmalı." };
  }
  if (amount > 10000) {
    return { ok: false, error: "Tek seferde 10.000 kredi üst sınırı." };
  }

  const target = await fetchTarget(userId);
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };

  // Addon olarak ekle (plan refresh'te yanmaz)
  await grantCredits(userId, Math.floor(amount), "admin_grant", true);

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "credit.grant",
    targetType: "user",
    targetId: userId,
    payload: { amount: Math.floor(amount), note, addon: true },
  });

  revalidatePath(`/users/${userId}`);
  return { ok: true };
}

// ─── ROL DEĞİŞTİRME (sadece superadmin) ──────────────────────────────────────

export async function setRoleAction(
  userId: string,
  newRole: UserRole,
): Promise<ActionResult> {
  const session = await requireRole("superadmin");
  if (!["user", "support", "admin", "superadmin"].includes(newRole)) {
    return { ok: false, error: "Geçersiz rol." };
  }
  const target = await fetchTarget(userId);
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };
  if (target.id === session.user.id && !hasAtLeast(newRole, "superadmin")) {
    return { ok: false, error: "Kendi superadmin rolünü düşüremezsin." };
  }

  await sql`
    UPDATE users SET role = ${newRole} WHERE id::text = ${userId}
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "user.set_role",
    targetType: "user",
    targetId: userId,
    before: { role: target.role },
    after: { role: newRole },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return { ok: true };
}

// ─── ŞİFRE RESET ─────────────────────────────────────────────────────────────

export async function resetPasswordAction(
  userId: string,
): Promise<ActionResult> {
  const session = await requireRole("admin");
  const target = await fetchTarget(userId);
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };

  const plain = generateStrongPassword();
  const hash = await bcrypt.hash(plain, 10);

  await sql`
    UPDATE users SET password_hash = ${hash} WHERE id::text = ${userId}
  `;

  await logAudit({
    adminId: session.user.id,
    adminEmail: session.user.email ?? null,
    action: "user.reset_password",
    targetType: "user",
    targetId: userId,
    // Plain şifre audit log'a YAZILMAZ — sadece aksiyonun kendisi.
  });

  revalidatePath(`/users/${userId}`);
  return { ok: true, newPassword: plain };
}
