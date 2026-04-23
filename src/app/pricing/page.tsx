"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ALL_PLANS } from "@/lib/plans";
import { useCredits } from "@/contexts/CreditsContext";
import BillingToggle, {
  type BillingPeriod,
} from "@/components/pricing/BillingToggle";
import PlanCard from "@/components/pricing/PlanCard";

export default function PricingPage() {
  const router = useRouter();
  const { status } = useSession();
  const { plan: currentPlan } = useCredits();
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, period: BillingPeriod) => {
    if (status !== "authenticated") {
      router.push(`/auth/signin?callbackUrl=/pricing`);
      return;
    }
    setError(null);
    setLoadingPlan(`${planId}:${period}`);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, period }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Ödeme oturumu oluşturulamadı");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div
      className="min-h-full pb-16 pt-10 px-6"
      style={{
        background:
          "radial-gradient(ellipse at top, #2a1a12 0%, #1a0f09 35%, #0a0a0a 70%)",
      }}
    >
      <div className="max-w-6xl mx-auto text-center mb-10">
        <h1 className="text-white text-[34px] md:text-[42px] font-serif leading-tight mb-3">
          {period === "yearly"
            ? "Yıllık aboneliklerde %20 indirim"
            : "Planını seç, üretmeye başla"}
        </h1>
        <p className="text-[#cbb8a8] text-[15px] mb-7">
          {period === "yearly"
            ? "En iyi değerli teklifimiz daha da iyi oldu. Yıllık planda ilk yıl %20 indirim."
            : "Her plan farklı kredi ve özellik sunar. İstediğin zaman değiştir veya iptal et."}
        </p>
        <BillingToggle value={period} onChange={setPeriod} />
        {error && <p className="mt-4 text-red-400 text-[13px]">{error}</p>}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        {ALL_PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            period={period}
            isCurrent={currentPlan?.id === p.id}
            loading={loadingPlan === `${p.id}:${period}`}
            onSubscribe={handleSubscribe}
          />
        ))}
      </div>

      <p className="text-center text-[12px] text-[#666] mt-10 max-w-xl mx-auto">
        Abonelikler otomatik yenilenir. Dilediğin zaman hesap ayarlarından iptal
        edebilirsin. Yıllık plan tek seferde faturalanır, krediler her ay
        yenilenir.
      </p>
    </div>
  );
}
