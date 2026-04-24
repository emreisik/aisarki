"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

const STATUSES = [
  "all",
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
];
const PLANS = ["all", "free", "pro", "premier"];

export default function SubSearchBar({
  initialQ,
  initialStatus,
  initialPlan,
}: {
  initialQ: string;
  initialStatus: string;
  initialPlan: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [plan, setPlan] = useState(initialPlan);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (status !== "all") params.set("status", status);
    else params.delete("status");
    if (plan !== "all") params.set("plan", plan);
    else params.delete("plan");
    params.delete("page");
    startTransition(() => {
      router.push(`/subscriptions?${params.toString()}`);
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
      <div className="relative flex-1 min-w-[260px]">
        <Search
          size={14}
          strokeWidth={1.75}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email veya isim…"
          className="w-full pl-9 pr-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "Tüm statüler" : s}
          </option>
        ))}
      </select>

      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        {PLANS.map((p) => (
          <option key={p} value={p}>
            {p === "all" ? "Tüm planlar" : p.toUpperCase()}
          </option>
        ))}
      </select>

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
