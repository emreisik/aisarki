import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, WEBHOOK_SECRET, resolvePriceId } from "@/lib/stripe";
import {
  applyPlanChange,
  downgradeToFree,
  getUserIdByStripeSubscription,
} from "@/lib/credits";

export const runtime = "nodejs";

/**
 * Stripe webhook handler.
 *
 * Events:
 *  - checkout.session.completed    → abonelik ilk başlatıldığında
 *  - customer.subscription.updated → plan değişimi, status değişimi
 *  - customer.subscription.deleted → abonelik iptal → Free
 *  - invoice.paid                  → dönem yenileme, kredi yenile
 *  - invoice.payment_failed        → kart başarısız, status=past_due
 */
export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET tanımlı değil");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Imza yok" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] imza doğrulama başarısız:", err);
    return NextResponse.json({ error: "Geçersiz imza" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode !== "subscription" || !s.subscription) break;
        const subId =
          typeof s.subscription === "string"
            ? s.subscription
            : s.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await handleSubscriptionEvent(sub);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(sub);
        if (userId) {
          await downgradeToFree(userId, sub.id);
        }
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const rawSub = (
          inv as unknown as { subscription?: string | Stripe.Subscription }
        ).subscription;
        if (!rawSub) break;
        const subId = typeof rawSub === "string" ? rawSub : rawSub.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        // Kredi yenileme applyPlanChange içinde zaten yapılıyor
        await handleSubscriptionEvent(sub);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const rawSub = (
          inv as unknown as { subscription?: string | Stripe.Subscription }
        ).subscription;
        if (!rawSub) break;
        const subId = typeof rawSub === "string" ? rawSub : rawSub.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await handleSubscriptionEvent(sub);
        break;
      }

      default:
        // Diğer event'leri sessizce geç
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[webhook] handler hatası:", e);
    // 500 dönmek Stripe'ın retry etmesini sağlar
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}

/**
 * Subscription objesinden user_id + plan bilgilerini çıkarıp DB'yi güncelle.
 */
async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const userId = await resolveUserId(sub);
  if (!userId) {
    console.error("[webhook] user_id çözülemedi sub:", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) {
    console.error("[webhook] price_id yok sub:", sub.id);
    return;
  }

  const resolved = resolvePriceId(priceId);
  if (!resolved) {
    console.error("[webhook] price_id map edilemedi:", priceId);
    return;
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Tür uyarısı için: current_period_start/end Stripe tipinde number (unix),
  // bazı sürümlerde doğrudan erişim yerine items.data[0] üzerinden alınır.
  const rawSub = sub as unknown as {
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end?: boolean;
  };
  const start = new Date(rawSub.current_period_start * 1000);
  const end = new Date(rawSub.current_period_end * 1000);

  const stripeStatus = sub.status;
  const mapped: "active" | "trialing" | "past_due" | "canceled" | "incomplete" =
    stripeStatus === "active"
      ? "active"
      : stripeStatus === "trialing"
        ? "trialing"
        : stripeStatus === "past_due"
          ? "past_due"
          : stripeStatus === "canceled"
            ? "canceled"
            : "incomplete";

  await applyPlanChange({
    userId,
    planId: resolved.planId,
    billingPeriod: resolved.period,
    status: mapped,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: Boolean(rawSub.cancel_at_period_end),
  });
}

/**
 * Stripe subscription'dan user_id'yi çöz.
 * - Önce subscription metadata (checkout.session.create sırasında yazdık)
 * - Yoksa DB'deki önceki kaydı ara
 */
async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const meta = (sub.metadata ?? {}) as Record<string, string | undefined>;
  if (meta.user_id) return meta.user_id;
  return getUserIdByStripeSubscription(sub.id);
}
