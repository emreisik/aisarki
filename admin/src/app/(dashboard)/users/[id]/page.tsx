import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/requireRole";
import { getUserDetail } from "@/lib/users";
import { hasAtLeast } from "@/lib/roles";
import { stripeCustomerUrl, stripeSubscriptionUrl } from "@/lib/subscriptions";
import { searchLedger } from "@/lib/ledger";
import LedgerRow from "../../ledger/LedgerRow";
import UserActions from "./UserActions";

export const metadata = { title: "User detay · Rifmo Admin" };

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("support");
  const { id } = await params;

  const u = await getUserDetail(id);
  if (!u) notFound();

  const canMutate = hasAtLeast(session.user.role, "admin");
  const canChangeRole = hasAtLeast(session.user.role, "superadmin");
  const isSelf = id === session.user.id;

  const { rows: recentLedger, total: ledgerTotal } = await searchLedger({
    userId: id,
    limit: 20,
    offset: 0,
  });

  return (
    <div>
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text2)] hover:text-white mb-4"
      >
        <ArrowLeft size={13} strokeWidth={1.75} />
        Users
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {u.displayName}
          </h1>
          <div className="text-sm text-[var(--text2)] mt-1">
            {u.email} · @{u.username} ·{" "}
            <span className="font-mono text-xs">{u.id.slice(0, 8)}</span>
          </div>
          {u.bannedAt && (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-[var(--danger)]/15 border border-[var(--danger)]/25 text-[var(--danger)] text-xs">
              <span className="font-medium uppercase tracking-wider">
                Banned
              </span>
              {u.bannedReason && <span>· {u.bannedReason}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <InfoCard label="Rol" value={u.role} />
        <InfoCard label="Plan" value={(u.planId ?? "—").toUpperCase()} />
        <InfoCard
          label="Kayıt"
          value={new Date(u.createdAt).toLocaleString("tr-TR")}
        />
        <InfoCard
          label="Kredi bakiyesi"
          value={`${u.balance ?? 0}`}
          sub={`plan: ${u.planCredits ?? 0} · addon: ${u.addonCredits ?? 0}`}
        />
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1.5">
            Abonelik
          </div>
          <div className="text-sm font-medium">
            {u.subscriptionStatus ?? "—"}
          </div>
          {u.subscriptionBillingPeriod && (
            <div className="text-[11px] text-[var(--text3)] mt-1">
              {u.subscriptionBillingPeriod}
              {u.subscriptionPeriodEnd &&
                " · " +
                  new Date(u.subscriptionPeriodEnd).toLocaleDateString("tr-TR")}
            </div>
          )}
          {u.stripeSubscriptionId && (
            <a
              href={stripeSubscriptionUrl(u.stripeSubscriptionId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--accent-hover)] hover:underline"
            >
              Stripe subscription
              <ExternalLink size={11} strokeWidth={1.75} />
            </a>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1.5">
            Stripe customer
          </div>
          {u.stripeCustomerId ? (
            <a
              href={stripeCustomerUrl(u.stripeCustomerId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono text-[var(--accent-hover)] hover:underline"
            >
              {u.stripeCustomerId}
              <ExternalLink size={11} strokeWidth={1.75} />
            </a>
          ) : (
            <div className="text-sm font-medium text-[var(--text3)]">—</div>
          )}
          <div className="text-[11px] text-[var(--text3)] mt-1">
            Dashboard'a gider: refund / invoice / ödeme yöntemi
          </div>
        </div>
      </div>

      {canMutate && !isSelf && (
        <UserActions
          userId={u.id}
          currentRole={u.role}
          isBanned={!!u.bannedAt}
          canChangeRole={canChangeRole}
        />
      )}
      {canMutate && isSelf && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text2)]">
          Kendi hesabın üzerinde ban / kredi / şifre aksiyonları devre dışıdır.
        </div>
      )}
      {!canMutate && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text2)]">
          Support rolü read-only görüntüleyebilir. Aksiyonlar admin+ rolü
          gerektirir.
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Credit Ledger
            </h2>
            <p className="text-xs text-[var(--text3)] mt-0.5">
              Son 20 event · toplam {ledgerTotal.toLocaleString()}
            </p>
          </div>
          {ledgerTotal > 20 && (
            <Link
              href={`/ledger?user=${u.id}`}
              className="text-xs text-[var(--accent-hover)] hover:underline"
            >
              Tümünü gör →
            </Link>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="text-right">Delta</th>
                <th>Reason</th>
                <th className="text-right">Balance after</th>
                <th>Ref task</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recentLedger.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-[var(--text3)] py-6 text-xs"
                  >
                    Henüz kredi hareketi yok.
                  </td>
                </tr>
              )}
              {recentLedger.map((e) => (
                <LedgerRow key={e.id} e={e} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className={`text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[var(--text3)] mt-1">{sub}</div>}
    </div>
  );
}
