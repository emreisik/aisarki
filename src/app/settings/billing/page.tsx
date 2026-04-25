"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCredits } from "@/contexts/CreditsContext";
import { useToast } from "@/contexts/ToastContext";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { formatUsd, PLAN_DEFINITIONS, type PlanId } from "@/lib/plans";

interface SubscriptionData {
  subscription: {
    id: string;
    planId: PlanId;
    status: string;
    billingPeriod: "monthly" | "yearly";
    currentPeriodStart: string;
    currentPeriodEnd: string;
    creditPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: {
    id: PlanId;
    name: string;
    features: Record<string, unknown>;
  };
}

interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  refTaskId: string | null;
  balanceAfter: number;
  createdAt: string;
}

const REASON_LABEL: Record<string, string> = {
  generate: "Şarkı üretimi",
  cover: "Cover",
  extend: "Uzatma",
  mashup: "Mashup",
  upload_extend: "Upload + Extend",
  refund: "İade",
  plan_refresh: "Plan yenileme",
  admin_grant: "Admin kredi hediyesi",
  addon_purchase: "Ek kredi alımı",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[#0a0a0a]" />}>
      <BillingPage />
    </Suspense>
  );
}

function BillingPage() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { credits, plan, refresh: refreshCredits } = useCredits();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success") === "1";

  useEffect(() => {
    if (success) {
      // Stripe'tan dönüş — kredi context'ini yenile
      refreshCredits();
    }
  }, [success, refreshCredits]);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sub, led] = await Promise.all([
          fetch("/api/me/subscription", { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : null,
          ),
          fetch("/api/me/ledger?limit=30", { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : { entries: [] },
          ),
        ]);
        if (cancelled) return;
        setSubData(sub);
        setLedger(led.entries ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Portal açılamadı", data.error);
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const sub = subData?.subscription;
  const planDef = plan
    ? PLAN_DEFINITIONS[plan.id as PlanId]
    : PLAN_DEFINITIONS.free;

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-24">
      <div className="max-w-3xl mx-auto px-5 pt-10">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[14px]">
            Aboneliğin aktif edildi. Kredilerin hesabına eklendi.
          </div>
        )}

        <h1 className="text-white text-[28px] font-bold mb-1">
          Fatura ve Abonelik
        </h1>
        <p className="text-[#888] text-[14px] mb-8">
          Planını yönet, kredi geçmişini gör, kartı güncelle.
        </p>

        {/* Aktif plan kartı */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-[16px] p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-[#888] text-[12px] uppercase tracking-wider mb-1">
                Aktif plan
              </div>
              <div className="text-white text-[22px] font-semibold">
                {planDef.name}
              </div>
              {sub && (
                <div className="text-[#888] text-[13px] mt-1">
                  {sub.billingPeriod === "yearly" ? "Yıllık" : "Aylık"} · Dönem
                  sonu: {formatDate(sub.currentPeriodEnd)}
                  {sub.cancelAtPeriodEnd && (
                    <span className="ml-2 text-amber-400">
                      (Dönem sonunda iptal)
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[#888] text-[12px] uppercase tracking-wider mb-1">
                Bakiye
              </div>
              <div className="text-white text-[22px] font-semibold tabular-nums">
                {credits?.balance ?? "—"}
              </div>
              <div className="text-[#888] text-[11px]">
                / {planDef.monthlyCredits} / ay
              </div>
            </div>
          </div>

          {sub && planDef.id !== "free" ? (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="h-10 px-4 rounded-full bg-white text-black text-[13px] font-semibold flex items-center gap-2 hover:bg-[#eee] transition-colors disabled:opacity-60"
              >
                {portalLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ExternalLink size={14} />
                )}
                Aboneliği Yönet
              </button>
              <Link
                href="/pricing"
                className="h-10 px-4 rounded-full border border-[#2a2a2a] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors"
              >
                <RefreshCw size={14} />
                Planı Değiştir
              </Link>
            </div>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-[#f472b6] via-[#f59e0b] to-[#ef4444] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              Planı Yükselt
            </Link>
          )}
        </div>

        {/* Plan özellikleri */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-[16px] p-6 mb-6">
          <div className="text-white text-[15px] font-semibold mb-3">
            Plan özellikleri
          </div>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <div className="text-[#888]">Aylık kredi</div>
            <div className="text-white text-right">
              {planDef.monthlyCredits}
            </div>
            <div className="text-[#888]">Max şarkı / ay</div>
            <div className="text-white text-right">
              {planDef.monthlyCredits / 10}
            </div>
            <div className="text-[#888]">Ticari kullanım</div>
            <div className="text-white text-right">
              {planDef.features.commercialUse ? "Evet" : "Hayır"}
            </div>
            <div className="text-[#888]">Max ses yükleme</div>
            <div className="text-white text-right">
              {planDef.features.uploadMaxMinutes} dk
            </div>
            <div className="text-[#888]">Stem ayırma</div>
            <div className="text-white text-right">
              {planDef.features.stems ? "12 stem" : "—"}
            </div>
            <div className="text-[#888]">Öncelikli kuyruk</div>
            <div className="text-white text-right">
              {planDef.features.priorityQueue ? "Evet" : "—"}
            </div>
          </div>
        </div>

        {/* Kredi geçmişi */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-[16px] p-6">
          <div className="text-white text-[15px] font-semibold mb-3">
            Kredi hareketleri
          </div>
          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 size={18} className="text-[#666] animate-spin" />
            </div>
          ) : ledger.length === 0 ? (
            <p className="text-[#666] text-[13px] py-3">Henüz hareket yok.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#1f1f1f]">
              {ledger.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-[13.5px]">
                      {REASON_LABEL[entry.reason] ?? entry.reason}
                    </div>
                    <div className="text-[#666] text-[11.5px]">
                      {formatDate(entry.createdAt)}
                    </div>
                  </div>
                  <div
                    className={`text-[14px] font-semibold tabular-nums ${
                      entry.delta > 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </div>
                  <div className="text-[#666] text-[12px] tabular-nums w-16 text-right">
                    = {entry.balanceAfter}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fiyat referansı (plan değiştirmeye yönlendirme) */}
        {planDef.id !== "free" && (
          <p className="text-center text-[12px] text-[#666] mt-8">
            Şu anki plan: {planDef.name} — aylık $
            {formatUsd(planDef.priceMonthlyUsd)} / yıllık $
            {formatUsd(planDef.priceYearlyUsd)}
          </p>
        )}

        {/* Unused router silencer */}
        <span className="hidden">{router ? "" : ""}</span>
      </div>
    </div>
  );
}
