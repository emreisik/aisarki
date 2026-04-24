import sql from "@/lib/db";

export interface LedgerEntry {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  delta: number;
  reason: string;
  refTaskId: string | null;
  balanceAfter: number;
  createdAt: string;
}

export type LedgerDirection = "all" | "credit" | "debit";

export interface LedgerSearchParams {
  userId?: string;
  userQuery?: string; // email veya username search
  reason?: string; // all | generate | refund | admin_grant | plan_refresh | addon_purchase | ...
  from?: string; // YYYY-MM-DD
  to?: string;
  direction?: LedgerDirection;
  limit: number;
  offset: number;
}

export async function searchLedger(params: LedgerSearchParams): Promise<{
  rows: LedgerEntry[];
  total: number;
  sumCredit: number;
  sumDebit: number;
}> {
  const userId = params.userId?.trim() || null;
  const userQ = params.userQuery?.trim();
  const likeQ = userQ ? `%${userQ}%` : null;
  const reason =
    params.reason && params.reason !== "all" ? params.reason : null;
  const from = params.from && params.from.length >= 8 ? params.from : null;
  const to = params.to && params.to.length >= 8 ? params.to : null;
  const direction = params.direction ?? "all";

  const rows = (await sql`
    SELECT l.id, l.user_id, l.delta, l.reason, l.ref_task_id,
           l.balance_after, l.created_at,
           u.email AS user_email, u.display_name AS user_display_name
    FROM credit_ledger l
    LEFT JOIN users u ON u.id::text = l.user_id
    WHERE
      (${userId}::text IS NULL OR l.user_id = ${userId})
      AND (${likeQ}::text IS NULL OR u.email ILIKE ${likeQ} OR u.display_name ILIKE ${likeQ})
      AND (${reason}::text IS NULL OR l.reason = ${reason})
      AND (${from}::date IS NULL OR l.created_at >= ${from}::date)
      AND (${to}::date IS NULL OR l.created_at < (${to}::date + INTERVAL '1 day'))
      AND (
        ${direction} = 'all'
        OR (${direction} = 'credit' AND l.delta > 0)
        OR (${direction} = 'debit' AND l.delta < 0)
      )
    ORDER BY l.created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `) as {
    id: string;
    user_id: string;
    delta: number;
    reason: string;
    ref_task_id: string | null;
    balance_after: number;
    created_at: string;
    user_email: string | null;
    user_display_name: string | null;
  }[];

  const aggRows = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN l.delta > 0 THEN l.delta ELSE 0 END), 0)::int AS sum_credit,
      COALESCE(SUM(CASE WHEN l.delta < 0 THEN l.delta ELSE 0 END), 0)::int AS sum_debit
    FROM credit_ledger l
    LEFT JOIN users u ON u.id::text = l.user_id
    WHERE
      (${userId}::text IS NULL OR l.user_id = ${userId})
      AND (${likeQ}::text IS NULL OR u.email ILIKE ${likeQ} OR u.display_name ILIKE ${likeQ})
      AND (${reason}::text IS NULL OR l.reason = ${reason})
      AND (${from}::date IS NULL OR l.created_at >= ${from}::date)
      AND (${to}::date IS NULL OR l.created_at < (${to}::date + INTERVAL '1 day'))
      AND (
        ${direction} = 'all'
        OR (${direction} = 'credit' AND l.delta > 0)
        OR (${direction} = 'debit' AND l.delta < 0)
      )
  `) as { total: number; sum_credit: number; sum_debit: number }[];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      userDisplayName: r.user_display_name,
      delta: r.delta,
      reason: r.reason,
      refTaskId: r.ref_task_id,
      balanceAfter: r.balance_after,
      createdAt: r.created_at,
    })),
    total: aggRows[0]?.total ?? 0,
    sumCredit: aggRows[0]?.sum_credit ?? 0,
    sumDebit: aggRows[0]?.sum_debit ?? 0,
  };
}

/**
 * Distinct reason listesi — filter dropdown'ı için.
 * DB'de ne varsa onu göstermek, kodda sabit tutmaktan daha sağlam.
 */
export async function getLedgerReasons(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT reason FROM credit_ledger ORDER BY reason
  `) as { reason: string }[];
  return rows.map((r) => r.reason);
}
