"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react";
import { useToast } from "@/contexts/ToastContext";
import { useCredits } from "@/contexts/CreditsContext";
import { localizeApiError } from "@/lib/sunoErrors";
import { OCCASIONS, type OccasionId } from "@/lib/occasions";
import {
  OccasionIcon,
  OCCASION_TO_CATEGORY,
  getCategoryTheme,
} from "@/lib/occasionIcons";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  occasion: OccasionId | null;
  onClose: () => void;
};

const GENRE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "auto", label: "Otomatik (önerilen)" },
  { id: "akustik", label: "Akustik · sıcak" },
  { id: "sehir_pop", label: "Pop · modern" },
  { id: "halk_turku", label: "Türkü · geleneksel" },
  { id: "arabesk", label: "Arabesk · duygusal" },
  { id: "fantezi", label: "Fantezi · klasik" },
  { id: "ilahi_sufi", label: "İlahi · ruhani" },
];

type AnimState = "closed" | "opening" | "open" | "closing";

export default function PersonalSongModal({ open, occasion, onClose }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { credits, costs, refresh: refreshCredits } = useCredits();

  const [isim, setIsim] = useState("");
  const [ikinciIsim, setIkinciIsim] = useState("");
  const [yas, setYas] = useState("");
  const [detay, setDetay] = useState("");
  const [genre, setGenre] = useState("auto");
  const [submitting, setSubmitting] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("closed");

  const tpl = occasion ? OCCASIONS[occasion] : null;
  const generateCost = costs.generate ?? 10;
  const hasEnoughCredits = (credits?.balance ?? 0) >= generateCost;
  const needsTwoNames = occasion === "dugun_nisan";
  const categoryId = occasion ? OCCASION_TO_CATEGORY[occasion] : "kultur";
  const theme = getCategoryTheme(categoryId);

  useEffect(() => {
    if (open) {
      setIsim("");
      setIkinciIsim("");
      setYas("");
      setDetay("");
      setGenre("auto");
    }
  }, [open, occasion]);

  useEffect(() => {
    if (open) {
      setAnimState("opening");
      const t = setTimeout(() => setAnimState("open"), 20);
      return () => clearTimeout(t);
    }
    if (animState !== "closed") {
      setAnimState("closing");
      const t = setTimeout(() => setAnimState("closed"), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!occasion || !tpl || submitting) return;
    if (!isim.trim()) {
      toast.error("Kim için olduğunu yazman gerek");
      return;
    }
    if (!hasEnoughCredits) {
      router.push("/pricing");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/personal-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direct: {
            occasion,
            isim: isim.trim(),
            ikinci_isim: needsTwoNames ? ikinciIsim.trim() || null : undefined,
            yas: yas.trim() ? Number(yas) : undefined,
            detay: detay.trim() || undefined,
          },
          genre: genre === "auto" ? undefined : genre,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 402) {
        const e = localizeApiError(data, "Kredi yetersiz");
        toast.error(e.title, e.message);
        router.push("/pricing");
        return;
      }
      if (!res.ok) {
        const e = localizeApiError(data, "Şarkı başlatılamadı");
        toast.error(e.title, e.message);
        return;
      }
      toast.success(
        "Şarkın hazırlanıyor",
        "1-2 dakika içinde Workspace'te dinlemeye hazır olacak.",
      );
      onClose();
      refreshCredits();
      router.push("/create");
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  };

  if (animState === "closed" || !tpl) return null;
  if (typeof document === "undefined") return null;

  const visible = animState === "open";
  const focusInput = (el: HTMLInputElement | null) => {
    if (el && visible) setTimeout(() => el.focus(), 50);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[170] flex items-end md:items-center justify-center md:p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative w-full md:max-w-[480px] bg-[#0d0d0d] border-t md:border border-[#1f1f1f] rounded-t-[28px] md:rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[86vh] transition-transform duration-300 ${
          visible
            ? "translate-y-0"
            : "translate-y-full md:translate-y-0 md:scale-95 md:opacity-0"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobilde görünür */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-[#2a2a2a]" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 md:pt-6 pb-5 border-b border-[#1a1a1a] flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accentSoft}10)`,
                border: `1px solid ${theme.accent}40`,
                color: theme.accent,
                boxShadow: `0 8px 24px ${theme.glow}`,
              }}
            >
              {occasion && (
                <OccasionIcon id={occasion} size={26} weight="duotone" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-white text-[18px] font-bold leading-tight">
                {tpl.label} Şarkısı
              </h2>
              <p className="text-[#777] text-[12px] mt-0.5">
                3 alan doldur, 3 dakikada hazır
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-9 h-9 rounded-full hover:bg-[#1a1a1a] flex items-center justify-center text-[#888] hover:text-white flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
              {needsTwoNames ? "Damat / Eş 1" : "Kim için?"}
            </label>
            <input
              ref={focusInput}
              type="text"
              value={isim}
              onChange={(e) => setIsim(e.target.value)}
              placeholder={
                needsTwoNames
                  ? "Örn: Ali"
                  : occasion === "anneler_gunu"
                    ? "Annenin adı (örn: Fatma)"
                    : occasion === "babalar_gunu"
                      ? "Babanın adı"
                      : "İsim (örn: Serra)"
              }
              className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl text-white text-[15px] placeholder:text-[#444] focus:outline-none transition-colors"
              style={{
                borderColor: isim.trim() ? `${theme.accent}55` : undefined,
              }}
            />
          </div>

          {needsTwoNames && (
            <div>
              <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
                Gelin / Eş 2
              </label>
              <input
                type="text"
                value={ikinciIsim}
                onChange={(e) => setIkinciIsim(e.target.value)}
                placeholder="Örn: Selin"
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl text-white text-[15px] placeholder:text-[#444] focus:outline-none transition-colors"
                style={{
                  borderColor: ikinciIsim.trim()
                    ? `${theme.accent}55`
                    : undefined,
                }}
              />
            </div>
          )}

          {occasion === "dogum_gunu" && (
            <div>
              <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
                Yaş <span className="text-[#555] normal-case">(opsiyonel)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={yas}
                onChange={(e) => setYas(e.target.value)}
                placeholder="30"
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl text-white text-[15px] placeholder:text-[#444] focus:outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
              Onun hakkında bir şey
              <span className="text-[#555] normal-case ml-1">(opsiyonel)</span>
            </label>
            <textarea
              value={detay}
              onChange={(e) => setDetay(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Sevdiği bir şey, paylaştığınız bir an, söylemek istediğin söz..."
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl text-white text-[15px] placeholder:text-[#444] focus:outline-none resize-none leading-relaxed transition-colors"
            />
            <div className="text-[#444] text-[10px] tabular-nums text-right mt-1">
              {detay.length}/500
            </div>
          </div>

          <div>
            <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
              Müzik tarzı
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full h-12 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl text-white text-[15px] focus:outline-none cursor-pointer"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer / CTA — sheet alt yapışık */}
        <div className="px-5 pt-3 pb-5 border-t border-[#1a1a1a] flex-shrink-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-[#0d0d0d]/80">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isim.trim()}
            className="w-full h-14 rounded-2xl font-bold text-black text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
            style={{
              background: hasEnoughCredits
                ? `linear-gradient(135deg, ${theme.accentSoft} 0%, ${theme.accent} 100%)`
                : "#1f1f1f",
              color: hasEnoughCredits ? "#000" : "#fff",
              boxShadow: hasEnoughCredits
                ? `0 12px 32px ${theme.glow}`
                : "none",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Hazırlanıyor…
              </>
            ) : !hasEnoughCredits ? (
              <>Krediyi Yükselt — {generateCost} kredi gerekli</>
            ) : (
              <>
                <MusicNotes size={17} weight="fill" />
                Şarkıyı Oluştur · {generateCost} kredi
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
