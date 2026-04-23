/**
 * Kredi mekaniği — check / deduct / refund / refresh.
 * Atomik UPDATE ... WHERE balance >= N pattern'i race condition'ları engeller.
 */

import sql from "./db";
import { ensureSchema } from "./taskStore";
import {
  PLAN_DEFINITIONS,
  CREDIT_COSTS,
  type CreditAction,
  type PlanDefinition,
  type PlanId,
} from "./plans";
import type { UserCredits, UserSubscription } from "@/types";

type CreditsRow = {
  balance: number;
  plan_credits: number;
  addon_credits: number;
  last_refresh_at: string | null;
  next_refresh_at: string | null;
};

type SubRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  current_period_start: string;
  current_period_end: string;
  credit_period_end: string;
  cancel_at_period_end: boolean;
};

/**
 * Bir Stripe subscription ID'sinden kullanıcıyı bul.
 */
export async function getUserIdByStripeSubscription(
  stripeSubscriptionId: string,
): Promise<string | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT user_id FROM subscriptions
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `) as { user_id: string }[];
  return rows[0]?.user_id ?? null;
}

/**
 * Kullanıcının Stripe customer ID'sini getir veya ayarla.
 */
export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT stripe_customer_id FROM users WHERE id::text = ${userId} LIMIT 1
  `) as { stripe_customer_id: string | null }[];
  return rows[0]?.stripe_customer_id ?? null;
}

export async function setStripeCustomerId(
  userId: string,
  customerId: string,
): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE users SET stripe_customer_id = ${customerId} WHERE id::text = ${userId}
  `;
}

/**
 * Stripe webhook'tan gelen plan değişimini uygula.
 * - Aktif subscription varsa canceled'a çek
 * - Yeni subscription satırı ekle
 * - Users.plan_id güncelle
 * - Kredileri yeni plana göre yenile (plan_credits = monthlyCredits, balance = plan + addon)
 */
export async function applyPlanChange(opts: {
  userId: string;
  planId: PlanId;
  billingPeriod: "monthly" | "yearly";
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  await ensureSchema();
  const plan = PLAN_DEFINITIONS[opts.planId];

  // Mevcut aktif subscription'ı canceled yap (duplicate aktif olmasın)
  await sql`
    UPDATE subscriptions
    SET status = 'canceled', updated_at = NOW()
    WHERE user_id = ${opts.userId}
      AND status IN ('active', 'trialing', 'past_due')
      AND stripe_subscription_id IS DISTINCT FROM ${opts.stripeSubscriptionId}
  `;

  // Yeni / güncellenmiş subscription upsert
  const creditPeriodEnd = new Date();
  creditPeriodEnd.setUTCMonth(creditPeriodEnd.getUTCMonth() + 1);

  await sql`
    INSERT INTO subscriptions (
      user_id, plan_id, status, billing_period,
      current_period_start, current_period_end, credit_period_end,
      cancel_at_period_end, stripe_customer_id, stripe_subscription_id
    )
    VALUES (
      ${opts.userId}, ${opts.planId}, ${opts.status}, ${opts.billingPeriod},
      ${opts.currentPeriodStart.toISOString()}, ${opts.currentPeriodEnd.toISOString()},
      ${creditPeriodEnd.toISOString()},
      ${opts.cancelAtPeriodEnd}, ${opts.stripeCustomerId}, ${opts.stripeSubscriptionId}
    )
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      billing_period = EXCLUDED.billing_period,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at = NOW()
  `;

  // Users.plan_id güncelle
  await sql`
    UPDATE users SET plan_id = ${opts.planId} WHERE id::text = ${opts.userId}
  `;

  // Aktif/trialing ise krediyi yenile (plan monthly_credits'e set et, addon korunur)
  if (opts.status === "active" || opts.status === "trialing") {
    await ensureCreditsRow(opts.userId);
    const nextRefresh = new Date();
    nextRefresh.setUTCMonth(nextRefresh.getUTCMonth() + 1);
    await sql`
      UPDATE credits
      SET plan_credits = ${plan.monthlyCredits},
          balance = ${plan.monthlyCredits} + addon_credits,
          last_refresh_at = NOW(),
          next_refresh_at = ${nextRefresh.toISOString()},
          updated_at = NOW()
      WHERE user_id = ${opts.userId}
    `;
    await sql`
      INSERT INTO credit_ledger (user_id, delta, reason, balance_after)
      VALUES (${opts.userId}, ${plan.monthlyCredits}, 'plan_refresh',
              ${plan.monthlyCredits})
    `;
  }
}

/**
 * Stripe'tan iptal/fail geldiğinde kullanıcıyı Free plana indir.
 */
export async function downgradeToFree(
  userId: string,
  stripeSubscriptionId: string,
): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE subscriptions
    SET status = 'canceled', updated_at = NOW()
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
  `;
  await sql`
    UPDATE users SET plan_id = 'free' WHERE id::text = ${userId}
  `;
  // Mevcut Free subscription yoksa oluştur
  await sql`
    INSERT INTO subscriptions (
      user_id, plan_id, status, billing_period,
      current_period_start, current_period_end, credit_period_end
    )
    SELECT ${userId}, 'free', 'active', 'monthly',
           NOW(), NOW() + INTERVAL '30 days',
           NOW() + INTERVAL '1 month'
    WHERE NOT EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = ${userId}
        AND plan_id = 'free'
        AND status = 'active'
    )
  `;
  // plan_credits'i Free'ye indir (addon korunur)
  const free = PLAN_DEFINITIONS.free;
  await sql`
    UPDATE credits
    SET plan_credits = ${free.monthlyCredits},
        balance = LEAST(balance, ${free.monthlyCredits} + addon_credits),
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

export async function getActiveSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT id, user_id, plan_id, status, billing_period,
           current_period_start, current_period_end, credit_period_end,
           cancel_at_period_end
    FROM subscriptions
    WHERE user_id = ${userId}
      AND status IN ('active', 'trialing', 'past_due')
    ORDER BY created_at DESC
    LIMIT 1
  `) as SubRow[];
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    planId: r.plan_id as PlanId,
    status: r.status as UserSubscription["status"],
    billingPeriod: r.billing_period as UserSubscription["billingPeriod"],
    currentPeriodStart: r.current_period_start,
    currentPeriodEnd: r.current_period_end,
    creditPeriodEnd: r.credit_period_end,
    cancelAtPeriodEnd: r.cancel_at_period_end,
  };
}

export async function getUserPlan(userId: string): Promise<PlanDefinition> {
  const sub = await getActiveSubscription(userId);
  return PLAN_DEFINITIONS[(sub?.planId ?? "free") as PlanId];
}

async function getCreditsRow(userId: string): Promise<CreditsRow | null> {
  const rows = (await sql`
    SELECT balance, plan_credits, addon_credits, last_refresh_at, next_refresh_at
    FROM credits
    WHERE user_id = ${userId}
    LIMIT 1
  `) as CreditsRow[];
  return rows[0] ?? null;
}

/**
 * Kullanıcıya credits satırı yoksa oluşturur (lazy bootstrap).
 * Mevcut kullanıcılar için taskStore seed'i ilgilenir, ama race'e karşı güvenlik.
 */
async function ensureCreditsRow(userId: string): Promise<CreditsRow> {
  let row = await getCreditsRow(userId);
  if (row) return row;

  const plan = await getUserPlan(userId);
  const initial = plan.refreshPeriod === "daily" ? plan.monthlyCredits : 0;
  await sql`
    INSERT INTO credits (user_id, balance, plan_credits, last_refresh_at, next_refresh_at)
    VALUES (
      ${userId}, ${initial}, ${initial},
      NOW(),
      ${plan.refreshPeriod === "daily" ? null : null}
    )
    ON CONFLICT (user_id) DO NOTHING
  `;
  row = await getCreditsRow(userId);
  if (!row) throw new Error("credits satırı oluşturulamadı");
  return row;
}

export async function getUserCredits(userId: string): Promise<UserCredits> {
  await ensureSchema();
  const row = await ensureCreditsRow(userId);
  return {
    balance: row.balance,
    planCredits: row.plan_credits,
    addonCredits: row.addon_credits,
    lastRefreshAt: row.last_refresh_at,
    nextRefreshAt: row.next_refresh_at,
  };
}

/**
 * Lazy refresh — eğer next_refresh_at geçtiyse plan kredilerini yeniler.
 * Kalan plan_credits sıfırlanır (Suno davranışı); addon_credits korunur.
 */
export async function maybeRefreshCredits(userId: string): Promise<void> {
  await ensureSchema();
  const row = await ensureCreditsRow(userId);
  const plan = await getUserPlan(userId);

  const now = new Date();
  const next = row.next_refresh_at ? new Date(row.next_refresh_at) : null;
  if (next && next > now) return;

  // Yeni next_refresh_at hesapla
  const nextDate = new Date(now);
  if (plan.refreshPeriod === "daily") {
    nextDate.setUTCHours(24, 0, 0, 0);
  } else {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
  }

  const newPlanCredits = plan.monthlyCredits;
  const newBalance = newPlanCredits + row.addon_credits;

  await sql`
    UPDATE credits
    SET plan_credits = ${newPlanCredits},
        balance = ${newBalance},
        last_refresh_at = NOW(),
        next_refresh_at = ${nextDate.toISOString()},
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
  await sql`
    INSERT INTO credit_ledger (user_id, delta, reason, balance_after)
    VALUES (${userId}, ${newPlanCredits}, 'plan_refresh', ${newBalance})
  `;
}

export interface CheckResult {
  ok: boolean;
  error?: "insufficient_credits" | "model_locked" | "plan_not_allowed";
  message?: string;
  credits: UserCredits;
  plan: PlanDefinition;
  cost: number;
}

export async function checkCanGenerate(
  userId: string,
  opts: { action: CreditAction; model?: string },
): Promise<CheckResult> {
  await maybeRefreshCredits(userId);
  const plan = await getUserPlan(userId);
  const credits = await getUserCredits(userId);
  const cost = CREDIT_COSTS[opts.action];

  if (opts.model && !plan.features.models.includes(opts.model)) {
    return {
      ok: false,
      error: "model_locked",
      message: `Bu model ${plan.name} planında kilitli — yükselt`,
      credits,
      plan,
      cost,
    };
  }

  if (credits.balance < cost) {
    return {
      ok: false,
      error: "insufficient_credits",
      message: `Yetersiz kredi (${credits.balance}/${cost}) — krediyi yükselt`,
      credits,
      plan,
      cost,
    };
  }

  return { ok: true, credits, plan, cost };
}

export interface DeductResult {
  ok: boolean;
  balanceAfter: number;
}

/**
 * Atomik deduct — balance yeterli değilse no-op, ok=false döner.
 * Race condition'a karşı güvenli.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: CreditAction | "refund" | "admin_grant" | "addon_purchase",
  refTaskId?: string,
): Promise<DeductResult> {
  await ensureSchema();
  if (amount <= 0) return { ok: true, balanceAfter: 0 };

  // Önce plan_credits'ten düş, yetmezse addon'a geç
  const rows = (await sql`
    UPDATE credits
    SET plan_credits  = GREATEST(0, plan_credits - ${amount}),
        addon_credits = GREATEST(0, addon_credits - GREATEST(0, ${amount} - plan_credits)),
        balance       = balance - ${amount},
        updated_at    = NOW()
    WHERE user_id = ${userId} AND balance >= ${amount}
    RETURNING balance AS balance_after
  `) as { balance_after: number }[];

  if (!rows[0]) return { ok: false, balanceAfter: -1 };

  await sql`
    INSERT INTO credit_ledger (user_id, delta, reason, ref_task_id, balance_after)
    VALUES (${userId}, ${-amount}, ${reason}, ${refTaskId ?? null}, ${rows[0].balance_after})
  `;
  return { ok: true, balanceAfter: rows[0].balance_after };
}

/**
 * Başarısız task'larda kredi iadesi. Ledger'a +amount yazar.
 * Duplicate refund'ı önlemek için (taskId, reason=refund) unique check.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  refTaskId?: string,
): Promise<void> {
  await ensureSchema();
  if (amount <= 0) return;

  // Aynı task için daha önce refund yapıldıysa atla
  if (refTaskId) {
    const existing = (await sql`
      SELECT 1 FROM credit_ledger
      WHERE user_id = ${userId}
        AND ref_task_id = ${refTaskId}
        AND reason = 'refund'
      LIMIT 1
    `) as unknown[];
    if (existing.length > 0) return;
  }

  const rows = (await sql`
    UPDATE credits
    SET plan_credits = plan_credits + ${amount},
        balance      = balance + ${amount},
        updated_at   = NOW()
    WHERE user_id = ${userId}
    RETURNING balance AS balance_after
  `) as { balance_after: number }[];

  if (!rows[0]) return;

  await sql`
    INSERT INTO credit_ledger (user_id, delta, reason, ref_task_id, balance_after)
    VALUES (${userId}, ${amount}, 'refund', ${refTaskId ?? null}, ${rows[0].balance_after})
  `;
}

export async function grantCredits(
  userId: string,
  amount: number,
  reason: "plan_refresh" | "addon_purchase" | "admin_grant",
  isAddon = false,
): Promise<void> {
  await ensureSchema();
  if (amount <= 0) return;
  await ensureCreditsRow(userId);

  const rows = (await sql`
    UPDATE credits
    SET plan_credits  = plan_credits  + ${isAddon ? 0 : amount},
        addon_credits = addon_credits + ${isAddon ? amount : 0},
        balance       = balance + ${amount},
        updated_at    = NOW()
    WHERE user_id = ${userId}
    RETURNING balance AS balance_after
  `) as { balance_after: number }[];

  if (!rows[0]) return;

  await sql`
    INSERT INTO credit_ledger (user_id, delta, reason, balance_after)
    VALUES (${userId}, ${amount}, ${reason}, ${rows[0].balance_after})
  `;
}

/**
 * Son N ledger kaydı (UI için).
 */
export async function getRecentLedger(
  userId: string,
  limit = 50,
): Promise<
  {
    id: string;
    delta: number;
    reason: string;
    refTaskId: string | null;
    balanceAfter: number;
    createdAt: string;
  }[]
> {
  await ensureSchema();
  const rows = (await sql`
    SELECT id, delta, reason, ref_task_id, balance_after, created_at
    FROM credit_ledger
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as {
    id: string;
    delta: number;
    reason: string;
    ref_task_id: string | null;
    balance_after: number;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    refTaskId: r.ref_task_id,
    balanceAfter: r.balance_after,
    createdAt: r.created_at,
  }));
}
