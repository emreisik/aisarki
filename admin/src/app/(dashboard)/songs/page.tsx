import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import { hasAtLeast } from "@/lib/roles";
import { searchSongs, cdnUrl, type SongRow } from "@/lib/songs";
import SongSearchBar from "./SongSearchBar";
import SongRowActions from "./SongRowActions";

export const metadata = { title: "Songs · Rifmo Admin" };

const PAGE_SIZE = 50;

type SP = {
  q?: string;
  status?: string;
  takedown?: string;
  user?: string;
  page?: string;
};

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requireRole("support");
  const canMutate = hasAtLeast(session.user.role, "admin");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = await searchSongs({
    q: sp.q,
    status: sp.status,
    takedownOnly: sp.takedown === "1",
    userId: sp.user,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Songs</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {total.toLocaleString()} kayıt
          </p>
        </div>
      </div>

      <SongSearchBar
        initialQ={sp.q ?? ""}
        initialStatus={sp.status ?? "all"}
        initialTakedown={sp.takedown === "1"}
        initialUserId={sp.user ?? ""}
      />

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 56 }}></th>
              <th>Title</th>
              <th>Creator</th>
              <th>Status</th>
              <th className="text-right">Plays</th>
              <th className="text-right">Likes</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-[var(--text3)] py-8"
                >
                  Sonuç yok.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <SongRowView key={s.id} s={s} canMutate={canMutate} />
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

function SongRowView({ s, canMutate }: { s: SongRow; canMutate: boolean }) {
  const cover = cdnUrl(s.imageKey);
  const audio = cdnUrl(s.audioKey);

  return (
    <tr className={s.takedownAt ? "opacity-60" : ""}>
      <td>
        {cover ? (
          <img
            src={cover}
            alt=""
            width={40}
            height={40}
            className="rounded object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-[var(--surface2)]" />
        )}
      </td>
      <td>
        <div className="font-medium truncate max-w-[300px]">{s.title}</div>
        <div className="text-xs text-[var(--text3)] truncate max-w-[300px]">
          {s.style ?? "—"}
        </div>
        {audio && (
          <audio
            src={audio}
            controls
            preload="none"
            className="mt-1 h-6"
            style={{ width: 240 }}
          />
        )}
      </td>
      <td>
        {s.creatorId ? (
          <Link
            href={`/users/${s.creatorId}`}
            className="hover:text-[var(--accent-hover)]"
          >
            <div className="text-sm">{s.creatorDisplayName ?? "—"}</div>
            <div className="text-xs text-[var(--text3)]">{s.creatorEmail}</div>
          </Link>
        ) : (
          <span className="text-[var(--text3)]">—</span>
        )}
      </td>
      <td>
        <SongStatus s={s} />
      </td>
      <td className="text-right tabular-nums">{s.playCount}</td>
      <td className="text-right tabular-nums">{s.likeCount}</td>
      <td className="text-[var(--text2)] text-xs tabular-nums">
        {formatDate(s.createdAt)}
      </td>
      <td>
        {canMutate ? (
          <SongRowActions songId={s.id} isTakedown={!!s.takedownAt} />
        ) : (
          <span className="text-[var(--text3)] text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

function SongStatus({ s }: { s: SongRow }) {
  if (s.takedownAt) {
    return (
      <span
        className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/25"
        title={s.takedownReason ?? undefined}
      >
        takedown
      </span>
    );
  }
  const tone =
    s.status === "complete"
      ? "success"
      : s.status === "failed"
        ? "danger"
        : "warn";
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
      {s.status}
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
    if (sp.takedown === "1") params.set("takedown", "1");
    if (sp.user) params.set("user", sp.user);
    params.set("page", String(p));
    return `/songs?${params.toString()}`;
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
