import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserCredits,
  getUserPlan,
  maybeRefreshCredits,
} from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    await maybeRefreshCredits(session.user.id);
    const [credits, plan] = await Promise.all([
      getUserCredits(session.user.id),
      getUserPlan(session.user.id),
    ]);
    return NextResponse.json({
      credits,
      plan: {
        id: plan.id,
        name: plan.name,
        monthlyCredits: plan.monthlyCredits,
        refreshPeriod: plan.refreshPeriod,
        features: plan.features,
      },
      costs: CREDIT_COSTS,
    });
  } catch (e) {
    console.error("[me/credits] hata:", e);
    return NextResponse.json(
      { error: "Kredi bilgisi alınamadı" },
      { status: 500 },
    );
  }
}
