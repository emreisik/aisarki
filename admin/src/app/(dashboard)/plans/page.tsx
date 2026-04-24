import { Check, X } from "lucide-react";
import { requireRole } from "@/lib/requireRole";
import {
  ALL_PLANS,
  CREDIT_COSTS,
  formatUsd,
  yearlyAsMonthly,
  type PlanDefinition,
} from "@shared/lib/plans";
import sql from "@/lib/db";

export const metadata = { title: "Plans · Rifmo Admin" };

export const dynamic = "force-dynamic";

interface PlanDbRow {
  plan_id: string;
  active: number;
  total: number;
}

async function getPlanUsage(): Promise<Map<string, PlanDbRow>> {
  const rows = (await sql`
    SELECT p.id AS plan_id,
           COALESCE(active.cnt, 0)::int AS active,
           COALESCE(total.cnt, 0)::int AS total
    FROM plans p
    LEFT JOIN (
      SELECT plan_id, COUNT(*) AS cnt FROM subscriptions
      WHERE status IN ('active','trialing') GROUP BY plan_id
    ) active ON active.plan_id = p.id
    LEFT JOIN (
      SELECT plan_id, COUNT(*) AS cnt FROM users WHERE plan_id IS NOT NULL GROUP BY plan_id
    ) total ON total.plan_id = p.id
  `) as PlanDbRow[];
  const m = new Map<string, PlanDbRow>();
  for (const r of rows) m.set(r.plan_id, r);
  return m;
}

export default async function PlansPage() {
  await requireRole("support");

  const usage = await getPlanUsage();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Read-only görünüm · kaynak:{" "}
          <code className="text-xs">src/lib/plans.ts</code>
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-[var(--text2)] mb-2">
          Kredi Maliyetleri
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          {Object.entries(CREDIT_COSTS).map(([action, cost]) => (
            <div key={action}>
              <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
                {action}
              </div>
              <div className="font-semibold tabular-nums">{cost}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {ALL_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            active={usage.get(plan.id)?.active ?? 0}
            total={usage.get(plan.id)?.total ?? 0}
          />
        ))}
      </div>

      <div className="mt-6 text-[11px] text-[var(--text3)] space-y-1">
        <div>
          Plan tanımları ve fiyatlar kodda hardcoded. Değişiklik için{" "}
          <code>src/lib/plans.ts</code> + Stripe product/price güncellemesi
          gerekir.
        </div>
        <div>
          <span className="text-[var(--text2)]">Active</span>: aktif/trialing
          subscription sayısı ·{" "}
          <span className="text-[var(--text2)]">Total</span>: users tablosunda
          plan_id bu olan tüm hesaplar.
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  active,
  total,
}: {
  plan: PlanDefinition;
  active: number;
  total: number;
}) {
  const monthlyEquivYearly = yearlyAsMonthly(plan);

  return (
    <div
      className={`rounded-lg border bg-[var(--surface)] p-5 ${
        plan.highlighted
          ? "border-[var(--accent)]/40"
          : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">{plan.name}</div>
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-mono mt-0.5">
            {plan.id}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
            Active
          </div>
          <div className="text-base font-semibold tabular-nums">{active}</div>
        </div>
      </div>

      <div className="mb-4 pb-4 border-b border-[var(--border)]">
        {plan.priceMonthlyUsd > 0 ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">
                ${formatUsd(plan.priceMonthlyUsd)}
              </span>
              <span className="text-xs text-[var(--text3)]">/ay</span>
            </div>
            <div className="text-[11px] text-[var(--text3)] mt-1">
              Yıllık: ${formatUsd(plan.priceYearlyUsd)}{" "}
              <span className="text-[var(--success)]">
                (~${formatUsd(monthlyEquivYearly)}/ay)
              </span>
            </div>
          </>
        ) : (
          <div className="text-2xl font-bold">Ücretsiz</div>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <Row
          label="Krediler"
          value={`${plan.monthlyCredits.toLocaleString()} / ${plan.refreshPeriod === "monthly" ? "ay" : "gün"}`}
        />
        <Row label="Toplam hesap" value={total.toLocaleString()} />
        <Row
          label="Modeller"
          value={plan.features.models.join(", ") || "—"}
          mono
        />
        <FeatureRow label="Ticari kullanım" on={plan.features.commercialUse} />
        <Row
          label="Upload max"
          value={`${plan.features.uploadMaxMinutes} dk`}
        />
        <FeatureRow label="Stems" on={plan.features.stems} />
        <FeatureRow label="Add-on kredi" on={plan.features.addOnCredits} />
        <FeatureRow label="Priority queue" on={plan.features.priorityQueue} />
        <FeatureRow label="Studio" on={plan.features.studio} />
        <FeatureRow label="Advanced editor" on={plan.features.advancedEditor} />
        <FeatureRow label="Early access" on={plan.features.earlyAccess} />
        <FeatureRow label="Voice tuning" on={plan.features.voiceTuning} />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[var(--text3)]">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-[10px] text-[var(--text2)]" : "font-medium tabular-nums"}`}
      >
        {value}
      </span>
    </div>
  );
}

function FeatureRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-[var(--text3)]">{label}</span>
      {on ? (
        <Check size={14} strokeWidth={2} className="text-[var(--success)]" />
      ) : (
        <X size={14} strokeWidth={2} className="text-[var(--text3)]" />
      )}
    </div>
  );
}
