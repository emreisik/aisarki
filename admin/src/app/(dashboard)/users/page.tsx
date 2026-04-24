import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import { searchUsers } from "@/lib/users";
import UserSearchBar from "./UserSearchBar";

export const metadata = { title: "Users · Rifmo Admin" };

const PAGE_SIZE = 50;

type SP = {
  q?: string;
  plan?: string;
  banned?: string;
  page?: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireRole("support");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = await searchUsers({
    q: sp.q,
    plan: sp.plan,
    bannedOnly: sp.banned === "1",
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {total.toLocaleString()} toplam
          </p>
        </div>
      </div>

      <UserSearchBar
        initialQ={sp.q ?? ""}
        initialPlan={sp.plan ?? "all"}
        initialBanned={sp.banned === "1"}
      />

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Plan</th>
              <th className="text-right">Kredi</th>
              <th>Kayıt</th>
              <th>Durum</th>
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
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link
                    href={`/users/${u.id}`}
                    className="block hover:text-[var(--accent-hover)]"
                  >
                    <div className="font-medium">{u.displayName}</div>
                    <div className="text-xs text-[var(--text3)]">
                      {u.email} · @{u.username}
                    </div>
                  </Link>
                </td>
                <td>
                  {u.role === "user" ? (
                    <span className="text-[var(--text3)]">user</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent-hover)] border border-[var(--accent)]/25">
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="uppercase text-xs tabular-nums">
                  {u.planId ?? "—"}
                </td>
                <td className="text-right tabular-nums">{u.balance ?? 0}</td>
                <td className="text-[var(--text2)] text-xs tabular-nums">
                  {formatDate(u.createdAt)}
                </td>
                <td>
                  {u.bannedAt ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/25">
                      banned
                    </span>
                  ) : (
                    <span className="text-[var(--success)] text-xs">
                      active
                    </span>
                  )}
                </td>
              </tr>
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
    if (sp.q) params.set("q", sp.q);
    if (sp.plan && sp.plan !== "all") params.set("plan", sp.plan);
    if (sp.banned === "1") params.set("banned", "1");
    params.set("page", String(p));
    return `/users?${params.toString()}`;
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

function formatDate(iso: string): string {
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
