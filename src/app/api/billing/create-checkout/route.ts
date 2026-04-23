import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";
import { ensureSchema } from "@/lib/taskStore";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { getStripeCustomerId, setStripeCustomerId } from "@/lib/credits";
import type { PlanId, BillingPeriod } from "@/lib/plans";

function getAppUrl(request: NextRequest): string {
  const env = process.env.APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  // Env teyit
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[billing/create-checkout] STRIPE_SECRET_KEY tanımlı değil");
    return NextResponse.json(
      { error: "Stripe ayarı eksik: STRIPE_SECRET_KEY .env'ye eklenmedi" },
      { status: 500 },
    );
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const { planId, period } = body as {
      planId: PlanId;
      period: BillingPeriod;
    };

    if (planId === "free") {
      return NextResponse.json(
        { error: "Free plan için ödeme gerekmez" },
        { status: 400 },
      );
    }

    const priceId = getStripePriceId(planId, period);
    if (!priceId) {
      return NextResponse.json(
        { error: "Plan için fiyat tanımlanmamış" },
        { status: 500 },
      );
    }

    // Stripe customer: mevcut varsa Stripe'da hâlâ var mı doğrula.
    // Mode değişimlerinde (test ↔ live) eski customer ID invalid olur.
    let customerId = await getStripeCustomerId(session.user.id);
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        // Deleted customer da "yok" sayılır
        if ((existing as { deleted?: boolean }).deleted) {
          customerId = null;
        }
      } catch (e) {
        const err = e as { code?: string; statusCode?: number };
        if (err.code === "resource_missing" || err.statusCode === 404) {
          console.warn(
            `[billing] Stripe customer ${customerId} bulunamadı (mode değişmiş olabilir), yeniden oluşturuluyor`,
          );
          customerId = null;
        } else {
          throw e;
        }
      }
    }

    if (!customerId) {
      const rows = (await sql`
        SELECT email, display_name FROM users WHERE id::text = ${session.user.id} LIMIT 1
      `) as { email: string; display_name: string | null }[];
      const user = rows[0];
      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.display_name ?? undefined,
        metadata: { user_id: session.user.id },
      });
      customerId = customer.id;
      await setStripeCustomerId(session.user.id, customerId);
    }

    const appUrl = getAppUrl(request);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          user_id: session.user.id,
          plan_id: planId,
          billing_period: period,
        },
      },
      metadata: {
        user_id: session.user.id,
        plan_id: planId,
        billing_period: period,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    const err = e as Error & { type?: string; code?: string };
    console.error("[billing/create-checkout] hata:", {
      type: err.type,
      code: err.code,
      message: err.message,
      stack: err.stack,
    });
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: isDev
          ? `Ödeme oturumu oluşturulamadı: ${err.message}`
          : "Ödeme oturumu oluşturulamadı",
        ...(isDev && { type: err.type, code: err.code }),
      },
      { status: 500 },
    );
  }
}
