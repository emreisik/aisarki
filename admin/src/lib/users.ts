import sql from "@/lib/db";

export interface UserRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  planId: string | null;
  balance: number | null;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string;
  stripeCustomerId: string | null;
}

export interface UserSearchParams {
  q?: string;
  plan?: string;
  bannedOnly?: boolean;
  limit: number;
  offset: number;
}

/**
 * Liste sayfası için users + credits LEFT JOIN + total count.
 * Search ILIKE email/username/display_name üzerinde.
 */
export async function searchUsers(params: UserSearchParams): Promise<{
  rows: UserRow[];
  total: number;
}> {
  const q = params.q?.trim();
  const likeQ = q ? `%${q}%` : null;
  const plan = params.plan && params.plan !== "all" ? params.plan : null;
  const bannedOnly = params.bannedOnly ?? false;

  const rows = (await sql`
    SELECT u.id, u.email, u.username, u.display_name, u.avatar_url,
           u.role, u.plan_id, u.banned_at, u.banned_reason,
           u.created_at, u.stripe_customer_id,
           c.balance
    FROM users u
    LEFT JOIN credits c ON c.user_id = u.id::text
    WHERE
      (${likeQ}::text IS NULL OR
        u.email ILIKE ${likeQ} OR
        u.username ILIKE ${likeQ} OR
        u.display_name ILIKE ${likeQ})
      AND (${plan}::text IS NULL OR u.plan_id = ${plan})
      AND (${bannedOnly} = FALSE OR u.banned_at IS NOT NULL)
    ORDER BY u.created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `) as {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    plan_id: string | null;
    banned_at: string | null;
    banned_reason: string | null;
    created_at: string;
    stripe_customer_id: string | null;
    balance: number | null;
  }[];

  const countRows = (await sql`
    SELECT COUNT(*)::int AS total
    FROM users u
    WHERE
      (${likeQ}::text IS NULL OR
        u.email ILIKE ${likeQ} OR
        u.username ILIKE ${likeQ} OR
        u.display_name ILIKE ${likeQ})
      AND (${plan}::text IS NULL OR u.plan_id = ${plan})
      AND (${bannedOnly} = FALSE OR u.banned_at IS NOT NULL)
  `) as { total: number }[];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      role: r.role,
      planId: r.plan_id,
      balance: r.balance,
      bannedAt: r.banned_at,
      bannedReason: r.banned_reason,
      createdAt: r.created_at,
      stripeCustomerId: r.stripe_customer_id,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

/**
 * Detay sayfası için tek user + credits + active subscription.
 */
export async function getUserDetail(userId: string): Promise<
  | (UserRow & {
      planCredits: number | null;
      addonCredits: number | null;
      subscriptionStatus: string | null;
      subscriptionBillingPeriod: string | null;
      subscriptionPeriodEnd: string | null;
      stripeSubscriptionId: string | null;
    })
  | null
> {
  const rows = (await sql`
    SELECT u.id, u.email, u.username, u.display_name, u.avatar_url,
           u.role, u.plan_id, u.banned_at, u.banned_reason,
           u.created_at, u.stripe_customer_id,
           c.balance, c.plan_credits, c.addon_credits,
           s.status AS sub_status, s.billing_period, s.current_period_end,
           s.stripe_subscription_id
    FROM users u
    LEFT JOIN credits c ON c.user_id = u.id::text
    LEFT JOIN LATERAL (
      SELECT status, billing_period, current_period_end, stripe_subscription_id
      FROM subscriptions
      WHERE user_id = u.id::text
      ORDER BY created_at DESC
      LIMIT 1
    ) s ON TRUE
    WHERE u.id::text = ${userId}
    LIMIT 1
  `) as {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    plan_id: string | null;
    banned_at: string | null;
    banned_reason: string | null;
    created_at: string;
    stripe_customer_id: string | null;
    balance: number | null;
    plan_credits: number | null;
    addon_credits: number | null;
    sub_status: string | null;
    billing_period: string | null;
    current_period_end: string | null;
    stripe_subscription_id: string | null;
  }[];

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    email: r.email,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    role: r.role,
    planId: r.plan_id,
    balance: r.balance,
    bannedAt: r.banned_at,
    bannedReason: r.banned_reason,
    createdAt: r.created_at,
    stripeCustomerId: r.stripe_customer_id,
    planCredits: r.plan_credits,
    addonCredits: r.addon_credits,
    subscriptionStatus: r.sub_status,
    subscriptionBillingPeriod: r.billing_period,
    subscriptionPeriodEnd: r.current_period_end,
    stripeSubscriptionId: r.stripe_subscription_id,
  };
}
