"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Drum,
} from "lucide-react";

export type SortKey = "newest" | "oldest" | "most_played";
export type FilterToggle = "liked" | "public" | "uploads";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "En Yeni" },
  { id: "oldest", label: "En Eski" },
  { id: "most_played", label: "En Çok Dinlenen" },
];

const TOGGLE_LABELS: Record<FilterToggle, string> = {
  liked: "Beğenilenler",
  public: "Herkese Açık",
  uploads: "Yüklemeler",
};

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  activeFilterCount: number;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  toggles: Record<FilterToggle, boolean>;
  onToggle: (t: FilterToggle) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onOpenLoops?: () => void;
};

export default function WorkspaceToolbar({
  query,
  onQueryChange,
  activeFilterCount,
  sort,
  onSortChange,
  toggles,
  onToggle,
  page,
  totalPages,
  onPageChange,
  onOpenLoops,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    if (sortOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [sortOpen]);

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "En Yeni";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[14px] mb-4">
        <span className="text-[#888]">Çalışma Alanları</span>
        <ChevronRight size={14} className="text-[#555]" />
        <span className="text-white font-semibold">Çalışma Alanım</span>
      </div>

      {/* Toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[220px] h-10 bg-[#141414] border border-[#1f1f1f] rounded-full flex items-center gap-2 px-4">
          <Search size={14} className="text-[#666]" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ara"
            className="flex-1 bg-transparent text-white text-[13px] placeholder-[#555] focus:outline-none"
          />
        </div>

        {/* Filters (N) */}
        <button className="h-10 px-4 rounded-full border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] flex items-center gap-1.5 text-white text-[13px] font-medium transition-colors">
          <SlidersHorizontal size={13} />
          Filtreler ({activeFilterCount})
          <ChevronDown size={12} />
        </button>

        {/* Loop / Sound üret */}
        {onOpenLoops && (
          <button
            onClick={onOpenLoops}
            className="h-10 px-4 rounded-full border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] flex items-center gap-1.5 text-white text-[13px] font-medium transition-colors"
            title="Kısa loop / ses efekti üret (drum loop, bassline, ambient...)"
          >
            <Drum size={13} />
            Loop Üret
          </button>
        )}

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="h-10 px-4 rounded-full border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] flex items-center gap-1.5 text-white text-[13px] font-medium transition-colors"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M6 12h12M9 18h6" />
            </svg>
            {activeSortLabel}
            <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-11 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] py-1.5 min-w-[160px] shadow-2xl z-50">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    onSortChange(o.id);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[#222] transition-colors ${
                    sort === o.id ? "text-white font-semibold" : "text-[#aaa]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle pills */}
        {(["liked", "public", "uploads"] as FilterToggle[]).map((t) => {
          const label = TOGGLE_LABELS[t];
          const active = toggles[t];
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              className={`h-10 px-4 rounded-full text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white text-black"
                  : "bg-[#141414] border border-[#1f1f1f] text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* Pagination */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="w-10 h-10 rounded-full border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] flex items-center justify-center disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} className="text-white" />
          </button>
          <div className="w-10 h-10 rounded-full border border-[#1f1f1f] bg-[#141414] flex items-center justify-center text-white text-[13px] font-semibold tabular-nums">
            {page}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="w-10 h-10 rounded-full border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] flex items-center justify-center disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
