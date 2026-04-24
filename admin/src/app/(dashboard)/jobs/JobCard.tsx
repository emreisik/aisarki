"use client";

import { useState } from "react";
import { Copy, Check, ChevronRight } from "lucide-react";
import type { JobDefinition } from "@/lib/job-catalog";
import type { JobStatusSummary } from "@/lib/jobs";

export default function JobCard({
  job,
  status,
}: {
  job: JobDefinition;
  status: JobStatusSummary | null;
}) {
  const [copiedDry, setCopiedDry] = useState(false);
  const [copiedExec, setCopiedExec] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = async (text: string, kind: "dry" | "exec") => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "dry") {
        setCopiedDry(true);
        setTimeout(() => setCopiedDry(false), 2000);
      } else {
        setCopiedExec(true);
        setTimeout(() => setCopiedExec(false), 2000);
      }
    } catch {
      // sessiz
    }
  };

  return (
    <div
      className={`rounded-lg border bg-[var(--surface)] p-4 ${
        job.dangerous ? "border-[var(--danger)]/30" : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold">{job.title}</div>
            <CategoryBadge category={job.category} />
            {job.dangerous && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/25">
                dangerous
              </span>
            )}
            {job.requiresArg && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-[var(--warn)]/15 text-[var(--warn)] border border-[var(--warn)]/25">
                input gerekir
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text2)] mt-1 leading-snug">
            {job.description}
          </div>
        </div>
        <StatusDot status={status?.lastStatus ?? null} />
      </div>

      {job.dryRunCommand && (
        <CommandBox
          label="Dry-run"
          command={job.dryRunCommand}
          copied={copiedDry}
          onCopy={() => copy(job.dryRunCommand!, "dry")}
        />
      )}
      <CommandBox
        label="Execute"
        command={job.executeCommand}
        copied={copiedExec}
        onCopy={() => copy(job.executeCommand, "exec")}
        danger={job.dangerous}
      />

      {status ? (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full flex items-center justify-between text-[11px] text-[var(--text2)] hover:text-white"
        >
          <span>
            <span className="text-[var(--text3)] mr-2">Son run:</span>
            {status.lastStatus === "success" && (
              <span className="text-[var(--success)]">başarılı</span>
            )}
            {status.lastStatus === "error" && (
              <span className="text-[var(--danger)]">hata</span>
            )}
            {status.lastStatus === "running" && (
              <span className="text-[var(--warn)]">çalışıyor</span>
            )}
            {status.lastStartedAt && (
              <span className="text-[var(--text3)] ml-2">
                {formatRelative(status.lastStartedAt)}
              </span>
            )}
            {status.lastDurationMs != null && (
              <span className="text-[var(--text3)] ml-2">
                · {formatDuration(status.lastDurationMs)}
              </span>
            )}
          </span>
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      ) : (
        <div className="mt-3 text-[11px] text-[var(--text3)]">
          Henüz tracked run yok. Script `_jobRun.mjs` helper'ı kullanmıyor
          olabilir.
        </div>
      )}

      {expanded && status && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-[11px] text-[var(--text2)]">
          <div>
            <div className="text-[10px] text-[var(--text3)] uppercase">
              Total
            </div>
            <div className="tabular-nums">{status.totalRuns}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text3)] uppercase">OK</div>
            <div className="tabular-nums text-[var(--success)]">
              {status.successRuns}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text3)] uppercase">Err</div>
            <div className="tabular-nums text-[var(--danger)]">
              {status.errorRuns}
            </div>
          </div>
          {status.lastError && (
            <div className="col-span-3 mt-1">
              <div className="text-[10px] text-[var(--text3)] uppercase mb-1">
                Son hata
              </div>
              <pre className="text-[11px] font-mono bg-[var(--bg)] border border-[var(--border)] rounded p-2 overflow-x-auto max-h-[120px]">
                {status.lastError}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommandBox({
  label,
  command,
  copied,
  onCopy,
  danger,
}: {
  label: string;
  command: string;
  copied: boolean;
  onCopy: () => void;
  danger?: boolean;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
          {label}
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[10px] text-[var(--text2)] hover:text-white transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
      <pre
        className={`text-[11px] font-mono rounded p-2 overflow-x-auto border ${
          danger && label === "Execute"
            ? "bg-[var(--danger)]/5 border-[var(--danger)]/25"
            : "bg-[var(--bg)] border-[var(--border)]"
        }`}
      >
        {command}
      </pre>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cls =
    category === "ops"
      ? "bg-[var(--accent)]/15 text-[var(--accent-hover)] border-[var(--accent)]/25"
      : category === "maintenance"
        ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/25"
        : category === "debug"
          ? "bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/25"
          : "bg-[var(--surface2)] text-[var(--text2)] border-[var(--border)]";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider border ${cls}`}
    >
      {category}
    </span>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const cls =
    status === "success"
      ? "bg-[var(--success)]"
      : status === "error"
        ? "bg-[var(--danger)]"
        : status === "running"
          ? "bg-[var(--warn)] animate-pulse"
          : "bg-[var(--text3)]";
  return <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${cls}`} />;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa önce`;
  const d = Math.floor(h / 24);
  return `${d}g önce`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.floor(s % 60);
  return `${m}m ${rs}s`;
}
