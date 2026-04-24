import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/requireRole";
import {
  searchSubscriptions,
  stripeCustomerUrl,
  type SubscriptionRow,
} from "@/lib/subscriptions";
import SubSearchBar from "./SubSearchBar";

export const metadata = { title: "Subscriptions · Rifmo Admin" };

const PAGE_SIZE = 50;

type SP = {
  q?: string;
  status?: string;
  plan?: string;
  page?: string;
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireRole("support");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = await searchSubscriptions({
    q: sp.q,
    status: sp.status,
    plan: sp.plan,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {total.toLocaleString()} kayıt
          </p>
        </div>
      </div>

      <SubSearchBar
        initialQ={sp.q ?? ""}
        initialStatus={sp.status ?? "all"}
        initialPlan={sp.plan ?? "all"}
      />

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Billing</th>
              <th>Period end</th>
              <th>Stripe</th>
              <th>Cancel at end</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-[var(--text3)] py-8"
                >
                  Sonuç yok.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <SubRow key={s.id} s={s} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} sp={sp} />
      )}
    </div>
  );
}

function SubRow({ s }: { s: SubscriptionRow }) {
  return (
    <tr>
      <td>
        <Link
          href={`/users/${s.userId}`}
          className="block hover:text-[var(--accent-hover)]"
        >
          <div className="font-medium">{s.userDisplayName}</div>
          <div className="text-xs text-[var(--text3)]">{s.userEmail}</div>
        </Link>
      </td>
      <td className="uppercase text-xs font-medium tabular-nums">{s.planId}</td>
      <td>
        <StatusBadge status={s.status} />
      </td>
      <td className="text-[var(--text2)] text-xs">{s.billingPeriod || "—"}</td>
      <td className="text-[var(--text2)] text-xs tabular-nums">
        {formatDate(s.currentPeriodEnd)}
      </td>
      <td>
        {s.stripeCustomerId ? (
          <a
            href={stripeCustomerUrl(s.stripeCustomerId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--accent-hover)] hover:underline font-mono"
          >
            {s.stripeCustomerId.slice(0, 14)}…
            <ExternalLink size={11} strokeWidth={1.75} />
          </a>
        ) : (
          <span className="text-[var(--text3)] text-xs">—</span>
        )}
      </td>
      <td>
        {s.cancelAtPeriodEnd ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--warn)]/15 text-[var(--warn)] border border-[var(--warn)]/25">
            yes
          </span>
        ) : (
          <span className="text-[var(--text3)] text-xs">no</span>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "trialing"
      ? "success"
      : status === "past_due" || status === "incomplete"
        ? "warn"
        : "danger";
  const cls =
    tone === "success"
      ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/25"
      : tone === "warn"
        ? "bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/25"
        : "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/25";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${cls}`}
    >
      {status}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  sp,
}: {
  page: number;
  totalPages: number;
  sp: SP;
}) {
  const mkHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.status && sp.status !== "all") params.set("status", sp.status);
    if (sp.plan && sp.plan !== "all") params.set("plan", sp.plan);
    params.set("page", String(p));
    return `/subscriptions?${params.toString()}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between text-xs text-[var(--text2)]">
      <div>
        Sayfa {page} / {totalPages}
      </div>
      <div className="flex gap-1">
        {page > 1 && (
          <Link
            href={mkHref(page - 1)}
            className="px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface2)]"
          >
            Önceki
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={mkHref(page + 1)}
            className="px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface2)]"
          >
            Sonraki
          </Link>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}
