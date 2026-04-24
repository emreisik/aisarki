"use client";

import { Check, X } from "lucide-react";
import { formatUsd, yearlyAsMonthly, type PlanDefinition } from "@/lib/plans";
import type { BillingPeriod } from "./BillingToggle";

type Props = {
  plan: PlanDefinition;
  period: BillingPeriod;
  isCurrent: boolean;
  loading?: boolean;
  onSubscribe: (planId: string, period: BillingPeriod) => void;
};

type FeatureRow = { ok: boolean; text: string };

function buildFeatureList(plan: PlanDefinition): FeatureRow[] {
  const f = plan.features;
  const rows: FeatureRow[] = [];

  if (plan.id === "free") {
    rows.push({ ok: true, text: "v4.5-all modeline erişim" });
    rows.push({ ok: true, text: "Her gün 50 kredi yenilenir (5 şarkı)" });
    rows.push({ ok: f.commercialUse, text: "Ticari kullanım hakkı" });
    rows.push({ ok: true, text: "Sadece standart özellikler" });
    rows.push({
      ok: true,
      text: `En fazla ${f.uploadMaxMinutes} dk ses yükleme`,
    });
    rows.push({ ok: true, text: "Ortak üretim kuyruğu" });
    rows.push({ ok: f.addOnCredits, text: "Ek kredi satın alma" });
  } else if (plan.id === "pro") {
    rows.push({ ok: true, text: "En iyi ve en kişisel v5.5 modeline erişim" });
    rows.push({
      ok: true,
      text: `${plan.monthlyCredits.toLocaleString("tr-TR")} kredi (500'e kadar şarkı) / ay`,
    });
    rows.push({ ok: f.commercialUse, text: "Yeni şarkılarda ticari kullanım" });
    rows.push({
      ok: true,
      text: "Standart + Pro özellikler (persona ve gelişmiş düzenleme)",
    });
    rows.push({ ok: f.stems, text: "12 vokal/enstrüman stem'e ayırma" });
    rows.push({
      ok: true,
      text: `En fazla ${f.uploadMaxMinutes} dk ses yükleme`,
    });
    rows.push({
      ok: f.voiceTuning,
      text: "Mevcut şarkılara vokal/enstrüman ekleme",
    });
    rows.push({ ok: f.earlyAccess, text: "Yeni özelliklere erken erişim" });
    rows.push({ ok: f.addOnCredits, text: "Ek kredi satın alma" });
    rows.push({
      ok: f.priorityQueue,
      text: "Öncelikli kuyruk, aynı anda 10 şarkı",
    });
    rows.push({ ok: true, text: "Kendi sesinle kaydet, yükle, üret" });
    rows.push({
      ok: f.voiceTuning,
      text: "Kendi sesinle v5.5 özel versiyonlarını eğit",
    });
  } else {
    // premier
    rows.push({ ok: f.wavDownload, text: "WAV (HD) format indirme" });
    rows.push({ ok: true, text: "En iyi ve en kişisel v5.5 modeline erişim" });
    rows.push({
      ok: true,
      text: `${plan.monthlyCredits.toLocaleString("tr-TR")} kredi (2.000'e kadar şarkı) / ay`,
    });
    rows.push({ ok: f.commercialUse, text: "Yeni şarkılarda ticari kullanım" });
    rows.push({
      ok: true,
      text: "Standart + Pro özellikler (persona ve gelişmiş düzenleme)",
    });
    rows.push({ ok: f.stems, text: "12 vokal/enstrüman stem'e ayırma" });
    rows.push({
      ok: true,
      text: `En fazla ${f.uploadMaxMinutes} dk ses yükleme`,
    });
    rows.push({
      ok: f.voiceTuning,
      text: "Mevcut şarkılara vokal/enstrüman ekleme",
    });
    rows.push({ ok: f.earlyAccess, text: "Yeni özelliklere erken erişim" });
    rows.push({ ok: f.addOnCredits, text: "Ek kredi satın alma" });
    rows.push({
      ok: f.priorityQueue,
      text: "Öncelikli kuyruk, aynı anda 10 şarkı",
    });
    rows.push({ ok: true, text: "Kendi sesinle kaydet, yükle, üret" });
    rows.push({
      ok: f.voiceTuning,
      text: "Kendi sesinle v5.5 özel versiyonlarını eğit",
    });
  }

  return rows;
}

export default function PlanCard({
  plan,
  period,
  isCurrent,
  loading,
  onSubscribe,
}: Props) {
  const isFree = plan.id === "free";
  const monthlyPrice = plan.priceMonthlyUsd;
  const yearlyPriceAsMonthly = yearlyAsMonthly(plan);
  const displayPrice =
    period === "yearly" ? yearlyPriceAsMonthly : monthlyPrice;
  const originalPrice =
    period === "yearly" && monthlyPrice > yearlyPriceAsMonthly
      ? monthlyPrice
      : null;
  const yearlySavings =
    period === "yearly" ? (monthlyPrice - yearlyPriceAsMonthly) * 12 : 0;

  const features = buildFeatureList(plan);
  const highlight = plan.highlighted;

  return (
    <div
      className={`relative rounded-[20px] p-7 flex flex-col ${
        highlight
          ? "border-[1.5px] border-[#ec4899] bg-[#141414]"
          : "border border-[#1f1f1f] bg-[#0f0f0f]"
      }`}
    >
      {highlight && period === "yearly" && (
        <span className="absolute top-5 right-5 text-[10px] font-bold px-2 py-1 rounded-full bg-[#3b82f6] text-white">
          SINIRLI SÜRE
        </span>
      )}

      <h3 className="text-white text-[22px] font-serif mb-2">{plan.name}</h3>
      <p className="text-[#aaa] text-[14px] mb-6 min-h-[42px]">
        {plan.id === "free" && "Başlangıç planımız."}
        {plan.id === "pro" &&
          "En iyi modellere ve düzenleme araçlarına erişim."}
        {plan.id === "premier" && "Maksimum kredi ve tüm özellikler açık."}
      </p>

      <div className="mb-5 min-h-[84px]">
        <div className="flex items-baseline gap-2">
          {originalPrice != null && (
            <span className="text-[#666] text-[18px] line-through">
              ${formatUsd(originalPrice)}
            </span>
          )}
          <span
            className={`text-[28px] font-semibold ${
              originalPrice ? "text-[#ec4899]" : "text-white"
            }`}
          >
            ${formatUsd(displayPrice)}
          </span>
          <span className="text-[#aaa] text-[14px]">/ay</span>
        </div>
        {period === "yearly" && yearlySavings > 0 && (
          <p className="text-[13px] text-[#aaa] mt-1">
            Yıllık faturayla ${formatUsd(yearlySavings)} tasarruf
          </p>
        )}
        {!isFree && (
          <p className="text-[12px] text-[#666] mt-0.5">
            Vergiler ödeme sırasında hesaplanır
          </p>
        )}
      </div>

      {isCurrent ? (
        <button
          disabled
          className="w-full h-12 rounded-full bg-transparent border border-[#2a2a2a] text-[#aaa] font-semibold cursor-default"
        >
          Mevcut Plan
        </button>
      ) : isFree ? (
        <button
          disabled
          className="w-full h-12 rounded-full bg-transparent border border-[#2a2a2a] text-[#666] font-semibold cursor-default"
        >
          Ücretsiz
        </button>
      ) : (
        <button
          onClick={() => onSubscribe(plan.id, period)}
          disabled={loading}
          className="w-full h-12 rounded-full bg-white text-black font-semibold hover:bg-[#eee] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Yönlendiriliyor…" : "Abone Ol"}
        </button>
      )}

      <div className="mt-7 flex flex-col gap-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 text-[13.5px]">
            {f.ok ? (
              <Check
                size={15}
                className="text-[#22c55e] mt-0.5 flex-shrink-0"
              />
            ) : (
              <X size={15} className="text-[#555] mt-0.5 flex-shrink-0" />
            )}
            <span className={f.ok ? "text-white" : "text-[#555]"}>
              {f.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
