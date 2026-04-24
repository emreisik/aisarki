import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import {
  searchAudit,
  getAuditActions,
  getAuditTargetTypes,
  targetRoute,
} from "@/lib/audit-log";
import AuditSearchBar from "./AuditSearchBar";
import AuditRow from "./AuditRow";

export const metadata = { title: "Audit Log · Rifmo Admin" };

const PAGE_SIZE = 100;

type SP = {
  admin?: string;
  action?: string;
  type?: string;
  target?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireRole("admin");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ rows, total }, actions, targetTypes] = await Promise.all([
    searchAudit({
      adminId: sp.admin,
      action: sp.action,
      targetType: sp.type,
      targetId: sp.target,
      from: sp.from,
      to: sp.to,
      limit: PAGE_SIZE,
      offset,
    }),
    getAuditActions(),
    getAuditTargetTypes(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {total.toLocaleString()} event · satıra tıklayınca before/after JSON
            açılır
          </p>
        </div>
      </div>

      <AuditSearchBar
        initialAdmin={sp.admin ?? ""}
        initialAction={sp.action ?? "all"}
        initialTargetType={sp.type ?? "all"}
        initialTargetId={sp.target ?? ""}
        initialFrom={sp.from ?? ""}
        initialTo={sp.to ?? ""}
        actions={actions}
        targetTypes={targetTypes}
      />

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP</th>
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
            {rows.map((entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                targetHref={targetRoute(entry.targetType, entry.targetId)}
              />
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
    if (sp.admin) params.set("admin", sp.admin);
    if (sp.action && sp.action !== "all") params.set("action", sp.action);
    if (sp.type && sp.type !== "all") params.set("type", sp.type);
    if (sp.target) params.set("target", sp.target);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    params.set("page", String(p));
    return `/audit?${params.toString()}`;
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
