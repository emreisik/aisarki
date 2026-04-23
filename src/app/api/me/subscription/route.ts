import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveSubscription, getUserPlan } from "@/lib/credits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const [subscription, plan] = await Promise.all([
      getActiveSubscription(session.user.id),
      getUserPlan(session.user.id),
    ]);
    return NextResponse.json({
      subscription,
      plan: {
        id: plan.id,
        name: plan.name,
        features: plan.features,
      },
    });
  } catch (e) {
    console.error("[me/subscription] hata:", e);
    return NextResponse.json(
      { error: "Abonelik bilgisi alınamadı" },
      { status: 500 },
    );
  }
}
