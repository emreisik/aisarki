"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

const PLANS = ["all", "free", "pro", "premier"];

export default function UserSearchBar({
  initialQ,
  initialPlan,
  initialBanned,
}: {
  initialQ: string;
  initialPlan: string;
  initialBanned: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [plan, setPlan] = useState(initialPlan);
  const [banned, setBanned] = useState(initialBanned);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (plan !== "all") params.set("plan", plan);
    else params.delete("plan");
    if (banned) params.set("banned", "1");
    else params.delete("banned");
    params.delete("page");
    startTransition(() => {
      router.push(`/users?${params.toString()}`);
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
      <div className="relative flex-1 min-w-[280px]">
        <Search
          size={14}
          strokeWidth={1.75}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email, username veya isim…"
          className="w-full pl-9 pr-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

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

      <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={banned}
          onChange={(e) => setBanned(e.target.checked)}
        />
        Sadece banned
      </label>

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
