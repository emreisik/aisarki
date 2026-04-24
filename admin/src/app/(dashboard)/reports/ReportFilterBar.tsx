"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const STATUSES = [
  { value: "open", label: "Açık" },
  { value: "actioned", label: "İşlem yapıldı" },
  { value: "dismissed", label: "Reddedildi" },
  { value: "all", label: "Tümü" },
];

const TYPES = [
  { value: "all", label: "Tüm target'lar" },
  { value: "song", label: "Song" },
  { value: "user", label: "User" },
  { value: "comment", label: "Comment" },
];

export default function ReportFilterBar({
  initialStatus,
  initialType,
}: {
  initialStatus: string;
  initialType: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string, defaultValue: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value !== defaultValue) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/reports?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-md p-0.5">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => update("status", s.value, "open")}
            disabled={pending}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              initialStatus === s.value
                ? "bg-[var(--surface3)] text-white"
                : "text-[var(--text2)] hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <select
        value={initialType}
        onChange={(e) => update("type", e.target.value, "all")}
        disabled={pending}
        className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
