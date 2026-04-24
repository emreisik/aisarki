"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const DIRECTIONS = [
  { value: "all", label: "Tüm yön" },
  { value: "credit", label: "Pozitif (+)" },
  { value: "debit", label: "Negatif (−)" },
];

export default function LedgerSearchBar({
  initialUser,
  initialReason,
  initialFrom,
  initialTo,
  initialDirection,
  reasons,
}: {
  initialUser: string;
  initialReason: string;
  initialFrom: string;
  initialTo: string;
  initialDirection: string;
  reasons: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [user, setUser] = useState(initialUser);
  const [reason, setReason] = useState(initialReason);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [direction, setDirection] = useState(initialDirection);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    if (user.trim()) params.set("user", user.trim());
    else params.delete("user");
    if (reason && reason !== "all") params.set("reason", reason);
    else params.delete("reason");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    if (direction && direction !== "all") params.set("dir", direction);
    else params.delete("dir");
    params.delete("page");
    startTransition(() => {
      router.push(`/ledger?${params.toString()}`);
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
        value={user}
        onChange={(e) => setUser(e.target.value)}
        placeholder="User ID veya email…"
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] min-w-[240px]"
      />

      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        <option value="all">Tüm tipler</option>
        {reasons.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        {DIRECTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

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
