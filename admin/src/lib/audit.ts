import { headers } from "next/headers";
import sql from "@/lib/db";

export interface AuditParams {
  adminId: string;
  adminEmail?: string | null;
  action: string; // 'user.ban' | 'credit.grant' | 'song.takedown' | ...
  targetType?: string; // 'user' | 'song' | 'subscription' | 'task'
  targetId?: string;
  before?: unknown;
  after?: unknown;
  payload?: unknown;
  /** Opsiyonel override — verilmezse Next.js headers() kullanılır. */
  ip?: string;
  userAgent?: string;
}

/**
 * admin_audit_log'a satır yazar. Her admin mutation bu fonksiyonu çağırmalı.
 * IP/UA bilgisi Next.js headers()'tan otomatik alınır; Route Handler veya
 * Server Action context'inde çalışır.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  let ip = params.ip;
  let ua = params.userAgent;
  if (!ip || !ua) {
    try {
      const h = await headers();
      ip ??=
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        undefined;
      ua ??= h.get("user-agent") ?? undefined;
    } catch {
      // headers() context dışında çağrıldıysa sessiz geç
    }
  }

  await sql`
    INSERT INTO admin_audit_log
      (admin_id, admin_email, action, target_type, target_id,
       before_state, after_state, payload, ip, user_agent)
    VALUES (
      ${params.adminId},
      ${params.adminEmail ?? null},
      ${params.action},
      ${params.targetType ?? null},
      ${params.targetId ?? null},
      ${params.before ? JSON.stringify(params.before) : null},
      ${params.after ? JSON.stringify(params.after) : null},
      ${params.payload ? JSON.stringify(params.payload) : null},
      ${ip ?? null},
      ${ua ?? null}
    )
  `;
}
