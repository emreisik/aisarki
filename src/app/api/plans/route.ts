import { NextResponse } from "next/server";
import { ALL_PLANS, yearlyAsMonthly } from "@/lib/plans";

export async function GET() {
  const plans = ALL_PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    monthlyCredits: p.monthlyCredits,
    refreshPeriod: p.refreshPeriod,
    priceMonthlyUsd: p.priceMonthlyUsd,
    priceYearlyUsd: p.priceYearlyUsd,
    yearlyAsMonthlyUsd: yearlyAsMonthly(p),
    features: p.features,
    highlighted: p.highlighted ?? false,
    sortOrder: p.sortOrder,
  }));
  return NextResponse.json({ plans });
}
