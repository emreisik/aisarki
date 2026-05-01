"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Music2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useCredits } from "@/contexts/CreditsContext";
import { localizeApiError } from "@/lib/sunoErrors";
import { OCCASIONS, type OccasionId } from "@/lib/occasions";
import { OccasionIcon } from "@/lib/occasionIcons";
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

/**
 * Vesile kartına tıklayınca açılan minimal form.
 * 3 alan: kişi adı + opsiyonel detay + opsiyonel tarz.
 * "Şarkıyı Oluştur" tıklayınca direkt /api/personal-song'a structured veri gider.
 */
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

  const tpl = occasion ? OCCASIONS[occasion] : null;
  const generateCost = costs.generate ?? 10;
  const hasEnoughCredits = (credits?.balance ?? 0) >= generateCost;
  const needsTwoNames = occasion === "dugun_nisan";

  // Modal açıldığında alanları sıfırla
  useEffect(() => {
    if (open) {
      setIsim("");
      setIkinciIsim("");
      setYas("");
      setDetay("");
      setGenre("auto");
    }
  }, [open, occasion]);

  // ESC ile kapat
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

  if (!open || !tpl) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-[480px] bg-[#0d0d0d] border border-[#1f1f1f] rounded-[20px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — vesile başlığı */}
        <div className="px-6 pt-6 pb-5 border-b border-[#1a1a1a] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#19b35c]/20 to-[#19b35c]/5 border border-[#19b35c]/25 flex items-center justify-center text-[#19b35c] flex-shrink-0">
              {occasion && (
                <OccasionIcon id={occasion} size={26} weight="duotone" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-white text-[18px] font-bold leading-tight">
                {tpl.label} Şarkısı
              </h2>
              <p className="text-[#777] text-[12px] mt-0.5">
                Kime ve ne için olduğunu yaz, gerisini biz halledelim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full hover:bg-[#1a1a1a] flex items-center justify-center text-[#888] hover:text-white flex-shrink-0 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* İsim */}
          <div>
            <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
              {needsTwoNames ? "Damat / Eş 1" : "Kim için?"}
            </label>
            <input
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
              autoFocus
              className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-white text-[14px] placeholder:text-[#444] focus:outline-none focus:border-[#19b35c]/50 transition-colors"
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
                className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-white text-[14px] placeholder:text-[#444] focus:outline-none focus:border-[#19b35c]/50"
              />
            </div>
          )}

          {/* Yaş — sadece doğum gününde */}
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
                className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-white text-[14px] placeholder:text-[#444] focus:outline-none focus:border-[#19b35c]/50"
              />
            </div>
          )}

          {/* Detay */}
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
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-white text-[14px] placeholder:text-[#444] focus:outline-none focus:border-[#19b35c]/50 resize-none leading-relaxed"
            />
            <div className="text-[#444] text-[10px] tabular-nums text-right mt-1">
              {detay.length}/500
            </div>
          </div>

          {/* Tarz */}
          <div>
            <label className="block text-[#aaa] text-[11px] font-semibold uppercase tracking-widest mb-2">
              Müzik tarzı
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-white text-[14px] focus:outline-none focus:border-[#19b35c]/50 cursor-pointer"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer / CTA */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isim.trim()}
            className="w-full h-12 rounded-full font-bold text-white text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{
              background: hasEnoughCredits
                ? "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)"
                : "#1f1f1f",
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
                <Music2 size={15} />
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
