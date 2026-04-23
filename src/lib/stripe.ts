/**
 * Stripe client + price id mapping.
 *
 * Env variables required:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - STRIPE_PRICE_PRO_MONTHLY
 * - STRIPE_PRICE_PRO_YEARLY
 * - STRIPE_PRICE_PREMIER_MONTHLY
 * - STRIPE_PRICE_PREMIER_YEARLY
 */

import Stripe from "stripe";
import type { PlanId, BillingPeriod } from "./plans";

const SECRET = process.env.STRIPE_SECRET_KEY;

if (!SECRET && process.env.NODE_ENV === "production") {
  console.error("[stripe] STRIPE_SECRET_KEY tanımlı değil");
}

export const stripe = new Stripe(SECRET ?? "sk_test_missing", {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

/**
 * Plan + period kombinasyonuna göre Stripe price ID'sini döndür.
 */
export function getStripePriceId(
  planId: PlanId,
  period: BillingPeriod,
): string | null {
  if (planId === "free") return null;
  const key = `STRIPE_PRICE_${planId.toUpperCase()}_${period.toUpperCase()}`;
  const val = process.env[key];
  return val?.trim() || null;
}

/**
 * Stripe price ID'sinden plan+period'u çöz — webhook'ta kullanılır.
 */
export function resolvePriceId(
  priceId: string,
): { planId: PlanId; period: BillingPeriod } | null {
  const candidates: Array<[PlanId, BillingPeriod]> = [
    ["pro", "monthly"],
    ["pro", "yearly"],
    ["premier", "monthly"],
    ["premier", "yearly"],
  ];
  for (const [planId, period] of candidates) {
    if (getStripePriceId(planId, period) === priceId) {
      return { planId, period };
    }
  }
  return null;
}

export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
