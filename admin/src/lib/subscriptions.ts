import sql from "@/lib/db";

export interface SubscriptionRow {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  planId: string;
  status: string;
  billingPeriod: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  creditPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

export interface SubSearchParams {
  q?: string;
  status?: string; // all | active | trialing | past_due | canceled | incomplete
  plan?: string; // all | free | pro | premier
  limit: number;
  offset: number;
}

export async function searchSubscriptions(params: SubSearchParams): Promise<{
  rows: SubscriptionRow[];
  total: number;
}> {
  const q = params.q?.trim();
  const likeQ = q ? `%${q}%` : null;
  const status =
    params.status && params.status !== "all" ? params.status : null;
  const plan = params.plan && params.plan !== "all" ? params.plan : null;

  const rows = (await sql`
    SELECT s.id, s.user_id, s.plan_id, s.status, s.billing_period,
           s.current_period_start, s.current_period_end, s.credit_period_end,
           s.cancel_at_period_end, s.stripe_customer_id, s.stripe_subscription_id,
           s.created_at,
           u.email AS user_email, u.display_name AS user_display_name
    FROM subscriptions s
    JOIN users u ON u.id::text = s.user_id
    WHERE
      (${likeQ}::text IS NULL OR u.email ILIKE ${likeQ} OR u.display_name ILIKE ${likeQ})
      AND (${status}::text IS NULL OR s.status = ${status})
      AND (${plan}::text IS NULL OR s.plan_id = ${plan})
    ORDER BY s.created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `) as {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    billing_period: string;
    current_period_start: string;
    current_period_end: string;
    credit_period_end: string;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
    user_email: string;
    user_display_name: string;
  }[];

  const countRows = (await sql`
    SELECT COUNT(*)::int AS total
    FROM subscriptions s
    JOIN users u ON u.id::text = s.user_id
    WHERE
      (${likeQ}::text IS NULL OR u.email ILIKE ${likeQ} OR u.display_name ILIKE ${likeQ})
      AND (${status}::text IS NULL OR s.status = ${status})
      AND (${plan}::text IS NULL OR s.plan_id = ${plan})
  `) as { total: number }[];

  return {
    rows: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      userDisplayName: r.user_display_name,
      planId: r.plan_id,
      status: r.status,
      billingPeriod: r.billing_period,
      currentPeriodStart: r.current_period_start,
      currentPeriodEnd: r.current_period_end,
      creditPeriodEnd: r.credit_period_end,
      cancelAtPeriodEnd: r.cancel_at_period_end,
      stripeCustomerId: r.stripe_customer_id,
      stripeSubscriptionId: r.stripe_subscription_id,
      createdAt: r.created_at,
    })),
    total: countRows[0]?.total ?? 0,
  };
}

/**
 * Stripe dashboard URL'leri. Mode (live/test) kullanıcının Stripe dashboard
 * login'inden geldiği için her iki URL de redirect'le doğru mode'a gider.
 */
export function stripeCustomerUrl(customerId: string): string {
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

export function stripeSubscriptionUrl(subscriptionId: string): string {
  return `https://dashboard.stripe.com/subscriptions/${subscriptionId}`;
}
