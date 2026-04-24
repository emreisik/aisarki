import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import {
  searchLedger,
  getLedgerReasons,
  type LedgerDirection,
} from "@/lib/ledger";
import LedgerSearchBar from "./LedgerSearchBar";
import LedgerRow from "./LedgerRow";

export const metadata = { title: "Credit Ledger · Rifmo Admin" };

const PAGE_SIZE = 100;

type SP = {
  user?: string;
  reason?: string;
  from?: string;
  to?: string;
  dir?: string;
  page?: string;
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireRole("support");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ rows, total, sumCredit, sumDebit }, reasons] = await Promise.all([
    searchLedger({
      userId: /^[0-9a-f-]{30,}$/i.test(sp.user ?? "") ? sp.user : undefined,
      userQuery: !/^[0-9a-f-]{30,}$/i.test(sp.user ?? "") ? sp.user : undefined,
      reason: sp.reason,
      from: sp.from,
      to: sp.to,
      direction: (sp.dir ?? "all") as LedgerDirection,
      limit: PAGE_SIZE,
      offset,
    }),
    getLedgerReasons(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Credit Ledger
          </h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {total.toLocaleString()} event · toplam{" "}
            <span className="text-[var(--success)]">+{sumCredit}</span> ·{" "}
            <span className="text-[var(--danger)]">{sumDebit}</span>
          </p>
        </div>
      </div>

      <LedgerSearchBar
        initialUser={sp.user ?? ""}
        initialReason={sp.reason ?? "all"}
        initialFrom={sp.from ?? ""}
        initialTo={sp.to ?? ""}
        initialDirection={sp.dir ?? "all"}
        reasons={reasons}
      />

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
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
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-[var(--text3)] py-8"
                >
                  Sonuç yok.
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <LedgerRow key={e.id} e={e} />
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
    if (sp.user) params.set("user", sp.user);
    if (sp.reason && sp.reason !== "all") params.set("reason", sp.reason);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (sp.dir && sp.dir !== "all") params.set("dir", sp.dir);
    params.set("page", String(p));
    return `/ledger?${params.toString()}`;
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
