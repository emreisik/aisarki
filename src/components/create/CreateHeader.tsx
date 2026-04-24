"use client";

import { Music2, ChevronDown, Lock } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useCredits } from "@/contexts/CreditsContext";

export type CreateMode = "simple" | "advanced" | "wizard";

export const MODEL_OPTIONS = [
  { id: "V5_5", label: "v5.5" },
  { id: "V5", label: "v5" },
  { id: "V4_5ALL", label: "v4.5-all" },
  { id: "V4_5PLUS", label: "v4.5+" },
  { id: "V4_5", label: "v4.5" },
  { id: "V4", label: "v4" },
] as const;

type Props = {
  mode: CreateMode;
  onModeChange: (m: CreateMode) => void;
  model: string;
  onModelChange: (m: string) => void;
};

export default function CreateHeader({
  mode,
  onModeChange,
  model,
  onModelChange,
}: Props) {
  const { credits, plan, loading } = useCredits();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const accessibleModels = plan?.features.models ?? ["V4_5ALL"];
  const isModelLocked = (id: string) => !accessibleModels.includes(id);

  const activeModel =
    MODEL_OPTIONS.find((o) => o.id === model)?.label ?? "v4.5-all";

  // Eğer seçili model kullanıcının planında yoksa otomatik düşür
  useEffect(() => {
    if (!plan) return;
    if (isModelLocked(model)) {
      const firstAllowed = MODEL_OPTIONS.find((o) => !isModelLocked(o.id))?.id;
      if (firstAllowed && firstAllowed !== model) onModelChange(firstAllowed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  const displayBalance = credits?.balance ?? (loading ? null : 0);

  return (
    <div className="flex items-center justify-between pb-4">
      {/* Credits */}
      <Link
        href="/pricing"
        title="Krediyi yükselt"
        className="h-9 px-3 rounded-full border border-[#2a2a2a] flex items-center gap-1.5 hover:bg-[#1a1a1a] transition-colors"
      >
        <Music2 size={13} className="text-white" />
        <span className="text-white text-[13px] font-semibold tabular-nums">
          {displayBalance ?? "…"}
        </span>
      </Link>

      {/* Simple/Wizard/Advanced toggle */}
      <div className="h-9 flex bg-transparent rounded-full border border-[#2a2a2a] p-0.5">
        <button
          onClick={() => onModeChange("simple")}
          className={`px-3 rounded-full text-[12px] font-semibold transition-colors ${
            mode === "simple"
              ? "bg-[#2a2a2a] text-white"
              : "text-[#aaa] hover:text-white"
          }`}
        >
          Basit
        </button>
        <button
          onClick={() => onModeChange("wizard")}
          className={`px-3 rounded-full text-[12px] font-semibold transition-colors flex items-center gap-1 ${
            mode === "wizard"
              ? "bg-[#2a2a2a] text-white"
              : "text-[#aaa] hover:text-white"
          }`}
        >
          Sihirli
          <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-[#19b35c] text-black">
            AI
          </span>
        </button>
        <button
          onClick={() => onModeChange("advanced")}
          className={`px-3 rounded-full text-[12px] font-semibold transition-colors ${
            mode === "advanced"
              ? "bg-[#2a2a2a] text-white"
              : "text-[#aaa] hover:text-white"
          }`}
        >
          Gelişmiş
        </button>
      </div>

      {/* Model dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="h-9 px-3 rounded-full border border-[#2a2a2a] flex items-center gap-1.5 hover:bg-[#1a1a1a] transition-colors"
        >
          <span className="text-white text-[13px] font-semibold">
            {activeModel}
          </span>
          <ChevronDown
            size={13}
            className={`text-white transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="absolute right-0 top-[40px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] py-1.5 min-w-[160px] shadow-2xl z-50">
            {MODEL_OPTIONS.map((o) => {
              const locked = isModelLocked(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    if (locked) return;
                    onModelChange(o.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between transition-colors ${
                    locked
                      ? "text-[#555] cursor-not-allowed"
                      : model === o.id
                        ? "text-white font-semibold hover:bg-[#222]"
                        : "text-[#aaa] hover:bg-[#222]"
                  }`}
                >
                  <span>{o.label}</span>
                  {locked && <Lock size={11} />}
                </button>
              );
            })}
            {accessibleModels.length < MODEL_OPTIONS.length && (
              <Link
                href="/pricing"
                className="block mt-1 mx-1.5 px-3 py-2 text-[12px] text-[#ec4899] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                onClick={() => setOpen(false)}
              >
                Daha fazla model için yükselt →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
