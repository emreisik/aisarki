"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

const STATUSES = ["all", "complete", "processing", "failed"];

export default function SongSearchBar({
  initialQ,
  initialStatus,
  initialTakedown,
  initialUserId,
}: {
  initialQ: string;
  initialStatus: string;
  initialTakedown: boolean;
  initialUserId: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [takedown, setTakedown] = useState(initialTakedown);
  const [userId, setUserId] = useState(initialUserId);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (status !== "all") params.set("status", status);
    else params.delete("status");
    if (takedown) params.set("takedown", "1");
    else params.delete("takedown");
    if (userId.trim()) params.set("user", userId.trim());
    else params.delete("user");
    params.delete("page");
    startTransition(() => {
      router.push(`/songs?${params.toString()}`);
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
          placeholder="Başlık veya prompt…"
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

      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="User ID"
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] font-mono w-[140px]"
      />

      <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={takedown}
          onChange={(e) => setTakedown(e.target.checked)}
        />
        Sadece takedown
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
