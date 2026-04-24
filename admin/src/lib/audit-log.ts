import sql from "@/lib/db";

export interface AuditEntry {
  id: string;
  adminId: string;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  beforeState: unknown;
  afterState: unknown;
  payload: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditSearchParams {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export async function searchAudit(params: AuditSearchParams): Promise<{
  rows: AuditEntry[];
  total: number;
}> {
  const adminId = params.adminId?.trim() || null;
  const action =
    params.action && params.action !== "all" ? params.action : null;
  const targetType =
    params.targetType && params.targetType !== "all" ? params.targetType : null;
  const targetId = params.targetId?.trim() || null;
  const from = params.from && params.from.length >= 8 ? params.from : null;
  const to = params.to && params.to.length >= 8 ? params.to : null;

  const rows = (await sql`
    SELECT id, admin_id, admin_email, action, target_type, target_id,
           before_state, after_state, payload, ip::text AS ip, user_agent, created_at
    FROM admin_audit_log
    WHERE
      (${adminId}::text IS NULL OR admin_id = ${adminId} OR admin_email ILIKE ${adminId})
      AND (${action}::text IS NULL OR action = ${action})
      AND (${targetType}::text IS NULL OR target_type = ${targetType})
      AND (${targetId}::text IS NULL OR target_id = ${targetId})
      AND (${from}::date IS NULL OR created_at >= ${from}::date)
      AND (${to}::date IS NULL OR created_at < (${to}::date + INTERVAL '1 day'))
    ORDER BY created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `) as {
    id: string;
    admin_id: string;
    admin_email: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    before_state: unknown;
    after_state: unknown;
    payload: unknown;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
  }[];

  const countRows = (await sql`
    SELECT COUNT(*)::int AS total FROM admin_audit_log
    WHERE
      (${adminId}::text IS NULL OR admin_id = ${adminId} OR admin_email ILIKE ${adminId})
      AND (${action}::text IS NULL OR action = ${action})
      AND (${targetType}::text IS NULL OR target_type = ${targetType})
      AND (${targetId}::text IS NULL OR target_id = ${targetId})
      AND (${from}::date IS NULL OR created_at >= ${from}::date)
      AND (${to}::date IS NULL OR created_at < (${to}::date + INTERVAL '1 day'))
  `) as { total: number }[];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      adminId: r.admin_id,
      adminEmail: r.admin_email,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      beforeState: r.before_state,
      afterState: r.after_state,
      payload: r.payload,
      ip: r.ip,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

export async function getAuditActions(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT action FROM admin_audit_log ORDER BY action
  `) as { action: string }[];
  return rows.map((r) => r.action);
}

export async function getAuditTargetTypes(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT target_type FROM admin_audit_log
    WHERE target_type IS NOT NULL ORDER BY target_type
  `) as { target_type: string }[];
  return rows.map((r) => r.target_type);
}

/**
 * target_type'a göre admin panelinde ilgili detay route'unu üretir.
 * Bilinmeyen tiplerde null döner — UI sadece ID text olarak gösterir.
 */
export function targetRoute(
  type: string | null,
  id: string | null,
): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "user":
      return `/users/${id}`;
    case "song":
      return `/songs?q=${encodeURIComponent(id)}`;
    case "subscription":
      return `/subscriptions?q=${encodeURIComponent(id)}`;
    case "task":
      return `/songs?user=${encodeURIComponent(id)}`;
    default:
      return null;
  }
}
