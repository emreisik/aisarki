import {
  Users,
  CreditCard,
  Music,
  Server,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { requireRole } from "@/lib/requireRole";
import { getKpiSnapshot, type MetricValue } from "@/lib/kpi";

export const metadata = { title: "Dashboard · Rifmo Admin" };

// Cache edilmesin — her açılışta güncel KPI
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireRole("support");

  const kpi = await getKpiSnapshot();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Canlı metrikler · Δ değerleri önceki periyoda göre
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel
          label="Users"
          icon={Users}
          metrics={[
            { label: "Total", m: kpi.users.total },
            { label: "DAU", m: kpi.users.dau },
            { label: "MAU", m: kpi.users.mau },
            { label: "Signups (7d)", m: kpi.users.signups7d },
          ]}
        />
        <Panel
          label="Revenue"
          icon={CreditCard}
          metrics={[
            {
              label: "MRR",
              m: kpi.revenue.mrrUsd,
              render: (v) => `$${(v / 100).toLocaleString()}`,
            },
            {
              label: "ARR",
              m: kpi.revenue.arrUsd,
              render: (v) => `$${(v / 100).toLocaleString()}`,
            },
            { label: "Free", m: kpi.revenue.freeCount },
            { label: "Paid", m: kpi.revenue.paidCount },
          ]}
        />
        <Panel
          label="Generation (24h)"
          icon={Music}
          metrics={[
            { label: "Complete", m: kpi.generation.songs24h },
            {
              label: "Success rate",
              m: kpi.generation.successRatePct,
              render: (v) => `${v}%`,
            },
            { label: "Failed", m: kpi.generation.failed24h },
            {
              label: "Avg dur.",
              m: kpi.generation.avgDurationSec,
              render: (v) => (v > 0 ? `${v}s` : "—"),
            },
          ]}
        />
        <Panel
          label="Infra (DB)"
          icon={Server}
          metrics={[
            { label: "Bunny'de", m: kpi.infra.songsInBunny },
            { label: "Suno-only", m: kpi.infra.songsSunoOnly },
            { label: "Kırık", m: kpi.infra.songsBroken },
            { label: "Img Bunny", m: kpi.infra.imagesInBunny },
          ]}
        />
      </div>

      <div className="mt-6 text-[11px] text-[var(--text3)]">
        DAU/MAU: son 24s/30g içinde play event'i olan unique user. MRR: aktif +
        trialing subscription'lar, yıllık planlar aylığa çevrilir. Infra:
        tamamen DB'den türetilir; gerçek Bunny/Suno API entegrasyonu P2'de.
      </div>
    </div>
  );
}

function Panel({
  label,
  icon: Icon,
  metrics,
}: {
  label: string;
  icon: typeof Users;
  metrics: {
    label: string;
    m: MetricValue;
    render?: (v: number) => string;
  }[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 mb-4 text-[var(--text2)]">
        <Icon size={15} strokeWidth={1.75} />
        <div className="text-xs font-medium uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
        {metrics.map((x) => (
          <Metric key={x.label} label={x.label} m={x.m} render={x.render} />
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  m,
  render,
}: {
  label: string;
  m: MetricValue;
  render?: (v: number) => string;
}) {
  const valueStr = render ? render(m.value) : m.value.toLocaleString("tr-TR");
  return (
    <div>
      <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-lg font-semibold tabular-nums">{valueStr}</div>
        {m.deltaPct != null && <DeltaBadge pct={m.deltaPct} />}
      </div>
    </div>
  );
}

function DeltaBadge({ pct }: { pct: number }) {
  if (!isFinite(pct)) return null;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const cls = up ? "text-[var(--success)]" : "text-[var(--danger)]";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums font-medium ${cls}`}
    >
      <Icon size={10} strokeWidth={2.5} />
      {up ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}
