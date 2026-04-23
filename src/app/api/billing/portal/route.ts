import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/credits";

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

  try {
    const customerId = await getStripeCustomerId(session.user.id);
    if (!customerId) {
      return NextResponse.json(
        { error: "Aktif aboneliğin yok" },
        { status: 400 },
      );
    }

    const appUrl = getAppUrl(request);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("[billing/portal] hata:", e);
    return NextResponse.json(
      { error: "Portal oluşturulamadı" },
      { status: 500 },
    );
  }
}
