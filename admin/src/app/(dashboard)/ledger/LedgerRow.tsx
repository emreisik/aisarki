import Link from "next/link";
import type { LedgerEntry } from "@/lib/ledger";

export default function LedgerRow({ e }: { e: LedgerEntry }) {
  const isCredit = e.delta > 0;
  return (
    <tr>
      <td>
        {e.userId ? (
          <Link
            href={`/users/${e.userId}`}
            className="hover:text-[var(--accent-hover)]"
          >
            <div className="text-sm">{e.userDisplayName ?? "—"}</div>
            <div className="text-xs text-[var(--text3)]">
              {e.userEmail ?? e.userId.slice(0, 8)}
            </div>
          </Link>
        ) : (
          <span className="text-[var(--text3)]">—</span>
        )}
      </td>
      <td
        className={`text-right tabular-nums font-medium ${
          isCredit ? "text-[var(--success)]" : "text-[var(--danger)]"
        }`}
      >
        {isCredit ? "+" : ""}
        {e.delta}
      </td>
      <td>
        <ReasonBadge reason={e.reason} />
      </td>
      <td className="text-right tabular-nums text-[var(--text2)]">
        {e.balanceAfter}
      </td>
      <td>
        {e.refTaskId ? (
          <span className="font-mono text-[11px] text-[var(--text3)]">
            {e.refTaskId.slice(0, 14)}…
          </span>
        ) : (
          <span className="text-[var(--text3)] text-xs">—</span>
        )}
      </td>
      <td className="text-[var(--text2)] text-xs tabular-nums whitespace-nowrap">
        {formatDateTime(e.createdAt)}
      </td>
    </tr>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  const tone =
    reason === "admin_grant"
      ? "warn"
      : reason === "refund" ||
          reason === "plan_refresh" ||
          reason === "addon_purchase"
        ? "success"
        : "default";
  const cls =
    tone === "warn"
      ? "bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/25"
      : tone === "success"
        ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/25"
        : "bg-[var(--surface2)] text-[var(--text2)] border-[var(--border)]";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${cls}`}
    >
      {reason}
    </span>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
