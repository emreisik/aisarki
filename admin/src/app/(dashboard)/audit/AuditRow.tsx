"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { AuditEntry } from "@/lib/audit-log";

export default function AuditRow({
  entry,
  targetHref,
}: {
  entry: AuditEntry;
  targetHref: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    !!entry.beforeState || !!entry.afterState || !!entry.payload;

  return (
    <>
      <tr
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={hasDetail ? "cursor-pointer" : ""}
      >
        <td style={{ width: 18 }}>
          {hasDetail && (
            <ChevronRight
              size={12}
              strokeWidth={2}
              className={`text-[var(--text3)] transition-transform ${
                open ? "rotate-90" : ""
              }`}
            />
          )}
        </td>
        <td>
          <div className="text-xs">{entry.adminEmail ?? "—"}</div>
          <div className="text-[10px] text-[var(--text3)] font-mono">
            {entry.adminId.slice(0, 8)}
          </div>
        </td>
        <td>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--surface2)] text-[var(--text2)] border border-[var(--border)]">
            {entry.action}
          </span>
        </td>
        <td>
          {entry.targetType ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {entry.targetType}
              </span>
              {entry.targetId && targetHref ? (
                <Link
                  href={targetHref}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-mono text-[var(--accent-hover)] hover:underline inline-flex items-center gap-0.5"
                >
                  {entry.targetId.slice(0, 10)}…
                  <ExternalLink size={10} strokeWidth={1.75} />
                </Link>
              ) : (
                <span className="text-xs font-mono text-[var(--text3)]">
                  {entry.targetId?.slice(0, 10) ?? "—"}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text3)] text-xs">—</span>
          )}
        </td>
        <td className="text-[var(--text3)] text-[11px] font-mono">
          {entry.ip ?? "—"}
        </td>
        <td className="text-[var(--text2)] text-xs tabular-nums whitespace-nowrap">
          {formatDateTime(entry.createdAt)}
        </td>
      </tr>
      {open && hasDetail && (
        <tr>
          <td></td>
          <td colSpan={5} className="bg-[var(--surface2)]">
            <div className="py-3 pr-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <JsonBlock title="Before" data={entry.beforeState} />
              <JsonBlock title="After" data={entry.afterState} />
              <JsonBlock title="Payload" data={entry.payload} />
            </div>
            {entry.userAgent && (
              <div className="pb-3 pr-3 text-[10px] text-[var(--text3)] font-mono truncate">
                UA: {entry.userAgent}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function JsonBlock({ title, data }: { title: string; data: unknown }) {
  if (!data) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
          {title}
        </div>
        <div className="text-[11px] text-[var(--text3)]">—</div>
      </div>
    );
  }
  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
        {title}
      </div>
      <pre className="text-[11px] font-mono bg-[var(--bg)] border border-[var(--border)] rounded p-2 overflow-x-auto leading-snug max-h-[220px]">
        {json}
      </pre>
    </div>
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
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}
