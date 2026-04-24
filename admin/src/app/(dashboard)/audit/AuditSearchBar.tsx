"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export default function AuditSearchBar({
  initialAdmin,
  initialAction,
  initialTargetType,
  initialTargetId,
  initialFrom,
  initialTo,
  actions,
  targetTypes,
}: {
  initialAdmin: string;
  initialAction: string;
  initialTargetType: string;
  initialTargetId: string;
  initialFrom: string;
  initialTo: string;
  actions: string[];
  targetTypes: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [admin, setAdmin] = useState(initialAdmin);
  const [action, setAction] = useState(initialAction);
  const [targetType, setTargetType] = useState(initialTargetType);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    if (admin.trim()) params.set("admin", admin.trim());
    else params.delete("admin");
    if (action && action !== "all") params.set("action", action);
    else params.delete("action");
    if (targetType && targetType !== "all") params.set("type", targetType);
    else params.delete("type");
    if (targetId.trim()) params.set("target", targetId.trim());
    else params.delete("target");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    params.delete("page");
    startTransition(() => {
      router.push(`/audit?${params.toString()}`);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-wrap gap-2 items-center"
    >
      <input
        value={admin}
        onChange={(e) => setAdmin(e.target.value)}
        placeholder="Admin ID veya email…"
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] min-w-[220px]"
      />

      <select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        <option value="all">Tüm aksiyonlar</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={targetType}
        onChange={(e) => setTargetType(e.target.value)}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        <option value="all">Tüm target'lar</option>
        {targetTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <input
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        placeholder="Target ID"
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] font-mono w-[160px]"
      />

      <div className="flex items-center gap-1">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-2 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent)] tabular-nums"
        />
        <span className="text-[var(--text3)] text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-2 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent)] tabular-nums"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
      >
        Ara
      </button>
    </form>
  );
}
