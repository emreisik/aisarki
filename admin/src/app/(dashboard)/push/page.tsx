import { requireRole } from "@/lib/requireRole";
import {
  countTargets,
  recentCampaigns,
  isPushConfigured,
  type PushSegment,
} from "@/lib/push";
import CampaignForm from "./CampaignForm";

export const metadata = { title: "Push · Rifmo Admin" };

export const dynamic = "force-dynamic";

export default async function PushPage() {
  await requireRole("admin");

  const configured = isPushConfigured();

  const [all, free, pro, premier, campaigns] = await Promise.all([
    configured ? countTargets("all") : 0,
    configured ? countTargets("free") : 0,
    configured ? countTargets("pro") : 0,
    configured ? countTargets("premier") : 0,
    recentCampaigns(20),
  ]);

  const counts: Record<PushSegment, number> = { all, free, pro, premier };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Push Campaigns</h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Web-push ile broadcast — plan bazlı segmentasyon
        </p>
      </div>

      {!configured && (
        <div className="mb-4 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/10 text-[var(--warn)] text-sm px-4 py-3">
          <div className="font-medium mb-1">VAPID env'leri eksik</div>
          <div className="text-[11px] text-[var(--text2)]">
            Admin'in push göndermesi için şunlar admin/.env.local'de olmalı:
            <br />
            <code className="text-[11px]">
              VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
            </code>
            <br />
            (Web app'in .env.local'indeki değerlerle aynı.)
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CampaignForm initialCounts={counts} />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--text2)] mb-3">
            Son Kampanyalar
          </div>
          {campaigns.length === 0 ? (
            <div className="text-sm text-[var(--text3)] py-6 text-center">
              Henüz kampanya yok.
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded border border-[var(--border)] bg-[var(--surface2)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.title}
                      </div>
                      <div className="text-xs text-[var(--text2)] line-clamp-2 mt-0.5">
                        {c.body}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text3)]">
                    <span className="uppercase tracking-wider">
                      {c.segmentPlan ?? "all"}
                    </span>
                    <span className="tabular-nums">
                      {c.sentCount}/{c.targetCount} gönderildi
                    </span>
                    {c.failedCount > 0 && (
                      <span className="text-[var(--danger)] tabular-nums">
                        {c.failedCount} hata
                      </span>
                    )}
                    <span className="ml-auto tabular-nums">
                      {formatDateTime(c.startedAt)}
                    </span>
                  </div>
                  {c.error && (
                    <pre className="mt-2 text-[10px] font-mono bg-[var(--bg)] border border-[var(--danger)]/30 rounded p-2 overflow-x-auto text-[var(--danger)]">
                      {c.error}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "sent"
      ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/25"
      : status === "running"
        ? "bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/25"
        : "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/25";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider border shrink-0 ${cls}`}
    >
      {status}
    </span>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
