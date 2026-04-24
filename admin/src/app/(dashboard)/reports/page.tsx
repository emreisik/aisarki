import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import { hasAtLeast } from "@/lib/roles";
import { searchReportGroups, countOpenReports } from "@/lib/reports";
import { cdnUrl } from "@/lib/songs";
import ReportGroupActions from "./ReportGroupActions";
import ReportFilterBar from "./ReportFilterBar";

export const metadata = { title: "Reports · Rifmo Admin" };

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

type SP = {
  status?: string;
  type?: string;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requireRole("support");
  const canMutate = hasAtLeast(session.user.role, "admin");

  const sp = await searchParams;

  const [{ groups, totalReports }, openCount] = await Promise.all([
    searchReportGroups({
      status: sp.status ?? "open",
      targetType: sp.type,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    countOpenReports(),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {totalReports} rapor · {groups.length} target ·{" "}
            <span className="text-[var(--warn)]">{openCount} açık</span>
          </p>
        </div>
      </div>

      <ReportFilterBar
        initialStatus={sp.status ?? "open"}
        initialType={sp.type ?? "all"}
      />

      <div className="mt-4 space-y-3">
        {groups.length === 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text3)] text-sm">
            Bu filtrelerle rapor yok.
          </div>
        )}
        {groups.map((g) => (
          <ReportGroupCard
            key={`${g.targetType}:${g.targetId}`}
            group={g}
            canMutate={canMutate}
          />
        ))}
      </div>
    </div>
  );
}

function ReportGroupCard({
  group,
  canMutate,
}: {
  group: Awaited<ReturnType<typeof searchReportGroups>>["groups"][number];
  canMutate: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--surface2)] text-[var(--text2)] border border-[var(--border)]">
              {group.targetType}
            </span>
            <span className="text-xs text-[var(--text3)] font-mono">
              {group.targetId.slice(0, 16)}…
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/25">
              ×{group.count} rapor
            </span>
          </div>

          <TargetPreview group={group} />
        </div>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-[var(--text2)] hover:text-white">
          Raporları göster ({group.reports.length})
        </summary>
        <div className="mt-2 space-y-2">
          {group.reports.map((r) => (
            <div
              key={r.id}
              className="rounded border border-[var(--border)] bg-[var(--surface2)] p-2.5 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                {r.reporterId ? (
                  <Link
                    href={`/users/${r.reporterId}`}
                    className="text-[var(--accent-hover)] hover:underline"
                  >
                    {r.reporterDisplayName ?? r.reporterEmail ?? "anonim"}
                  </Link>
                ) : (
                  <span className="text-[var(--text3)]">anonim</span>
                )}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--surface3)] text-[var(--text2)]">
                  {r.reason}
                </span>
                <span className="text-[10px] text-[var(--text3)] ml-auto">
                  {formatDate(r.createdAt)}
                </span>
                <StatusBadge status={r.status} />
              </div>
              {r.note && (
                <div className="text-[var(--text2)] leading-snug">{r.note}</div>
              )}
            </div>
          ))}
        </div>
      </details>

      {canMutate && group.reports.some((r) => r.status === "open") && (
        <ReportGroupActions
          targetType={group.targetType}
          targetId={group.targetId}
          alreadyTakenDown={!!group.song?.takedownAt}
          reporters={group.reports
            .filter((r) => r.status === "open")
            .map((r) => ({
              id: r.reporterId,
              label:
                r.reporterEmail ??
                r.reporterDisplayName ??
                r.reporterId.slice(0, 10),
            }))}
        />
      )}
    </div>
  );
}

function TargetPreview({
  group,
}: {
  group: Awaited<ReturnType<typeof searchReportGroups>>["groups"][number];
}) {
  if (group.targetType === "song" && group.song) {
    const cover = cdnUrl(group.song.imageKey);
    const audio = cdnUrl(group.song.audioKey);
    return (
      <div className="flex items-start gap-3">
        {cover ? (
          <img
            src={cover}
            alt=""
            width={48}
            height={48}
            className="rounded object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-[var(--surface2)] shrink-0" />
        )}
        <div className="min-w-0">
          <Link
            href={`/songs?q=${encodeURIComponent(group.song.id)}`}
            className="text-sm font-medium hover:text-[var(--accent-hover)] block truncate"
          >
            {group.song.title}
          </Link>
          {group.song.creatorId && (
            <Link
              href={`/users/${group.song.creatorId}`}
              className="text-xs text-[var(--text3)] hover:text-[var(--text2)] truncate block"
            >
              {group.song.creatorDisplayName ?? group.song.creatorEmail}
            </Link>
          )}
          {group.song.takedownAt && (
            <div className="text-[10px] text-[var(--danger)] mt-0.5 uppercase tracking-wider">
              zaten takedown
            </div>
          )}
          {audio && (
            <audio
              src={audio}
              controls
              preload="none"
              className="mt-1 h-6"
              style={{ width: 240 }}
            />
          )}
        </div>
      </div>
    );
  }

  if (group.targetType === "user" && group.user) {
    return (
      <div>
        <Link
          href={`/users/${group.user.id}`}
          className="text-sm font-medium hover:text-[var(--accent-hover)]"
        >
          {group.user.displayName}
        </Link>
        <div className="text-xs text-[var(--text3)]">{group.user.email}</div>
        {group.user.bannedAt && (
          <div className="text-[10px] text-[var(--danger)] mt-0.5 uppercase tracking-wider">
            banned
          </div>
        )}
      </div>
    );
  }

  if (group.targetType === "comment" && group.comment) {
    return (
      <div>
        <div className="text-sm leading-snug italic">
          &ldquo;{group.comment.body}&rdquo;
        </div>
        <div className="text-xs text-[var(--text3)] mt-1">
          {group.comment.authorEmail ?? group.comment.authorId.slice(0, 10)} ·
          şarkı:{" "}
          <Link
            href={`/songs?q=${encodeURIComponent(group.comment.songId)}`}
            className="text-[var(--accent-hover)] hover:underline font-mono"
          >
            {group.comment.songId.slice(0, 10)}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs text-[var(--text3)]">
      Target detayı yüklenemedi (silinmiş olabilir).
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/25"
      : status === "actioned"
        ? "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/25"
        : "bg-[var(--surface3)] text-[var(--text3)] border-[var(--border)]";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider border ${cls}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
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
