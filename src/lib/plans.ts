/**
 * Plan tanımları ve kredi maliyetleri — tüm abonelik sisteminin merkezi config'i.
 * DB'deki `plans` tablosunun seed'i de buradan beslenir.
 */

export type PlanId = "free" | "pro" | "premier";
export type RefreshPeriod = "daily" | "monthly";
export type BillingPeriod = "monthly" | "yearly";

export interface PlanFeatures {
  /** Erişilebilir model ID'leri (MusicGenerator MODELS ile eşleşir) */
  models: string[];
  commercialUse: boolean;
  uploadMaxMinutes: number;
  /** 12 stem'e ayırma */
  stems: boolean;
  /** WAV (HD) indirme */
  wavDownload: boolean;
  /** Add-on kredi satın alma hakkı */
  addOnCredits: boolean;
  /** Öncelikli kuyruk, 10 eşzamanlı */
  priorityQueue: boolean;
  /** Early access to new features */
  earlyAccess: boolean;
  /** Custom voice tuning */
  voiceTuning: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyCredits: number;
  refreshPeriod: RefreshPeriod;
  /** USD cent cinsinden (Stripe standart) */
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  features: PlanFeatures;
  sortOrder: number;
  highlighted?: boolean;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Plan",
    monthlyCredits: 10, // Ayda 1 şarkı
    refreshPeriod: "monthly",
    priceMonthlyUsd: 0,
    priceYearlyUsd: 0,
    features: {
      models: ["V4_5ALL"],
      commercialUse: false,
      uploadMaxMinutes: 8,
      stems: false,
      wavDownload: false,
      addOnCredits: false,
      priorityQueue: false,
      earlyAccess: false,
      voiceTuning: false,
    },
    sortOrder: 0,
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    monthlyCredits: 250, // Ayda 25 şarkı
    refreshPeriod: "monthly",
    priceMonthlyUsd: 1700, // $17.00
    priceYearlyUsd: 16300, // $163.00 (%20 indirim, yılda $204 yerine)
    features: {
      models: ["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"],
      commercialUse: true,
      uploadMaxMinutes: 30,
      stems: true,
      wavDownload: true,
      addOnCredits: true,
      priorityQueue: true,
      earlyAccess: true,
      voiceTuning: true,
    },
    sortOrder: 1,
    highlighted: true,
  },
  premier: {
    id: "premier",
    name: "Premier Plan",
    monthlyCredits: 800, // Ayda 80 şarkı
    refreshPeriod: "monthly",
    priceMonthlyUsd: 5400, // $54.00
    priceYearlyUsd: 51800, // $518.00 (%20 indirim, yılda $648 yerine)
    features: {
      models: ["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"],
      commercialUse: true,
      uploadMaxMinutes: 30,
      stems: true,
      wavDownload: true,
      addOnCredits: true,
      priorityQueue: true,
      earlyAccess: true,
      voiceTuning: true,
    },
    sortOrder: 2,
  },
};

export const ALL_PLANS: PlanDefinition[] = Object.values(PLAN_DEFINITIONS).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

export type CreditAction =
  | "generate"
  | "cover"
  | "extend"
  | "mashup"
  | "upload"
  | "upload_extend"
  | "stems_separate"
  | "stems_split"
  | "wav_convert"
  | "boost_style";

export const CREDIT_COSTS: Record<CreditAction, number> = {
  generate: 10,
  cover: 10,
  extend: 10,
  mashup: 10,
  upload: 0,
  upload_extend: 10,
  stems_separate: 10, // vocal + enstrümantal
  stems_split: 50, // 12 stem
  wav_convert: 0, // ücretsiz format dönüşümü
  boost_style: 0, // sync, ücretsiz
};

export function getPlan(id: PlanId | string): PlanDefinition {
  const p = PLAN_DEFINITIONS[id as PlanId];
  return p ?? PLAN_DEFINITIONS.free;
}

/** USD cent → "$17" / "$17.50" */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** Yıllık fiyat ay başına düşen değere çevrilir (UI karşılaştırma için) */
export function yearlyAsMonthly(plan: PlanDefinition): number {
  return Math.round(plan.priceYearlyUsd / 12);
}
