"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Music2,
  Lock,
  Check,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCredits } from "@/contexts/CreditsContext";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";
import {
  MOOD_CARDS,
  GENRE_CARDS,
  REGION_CARDS,
  THEME_TEMPLATES,
  sortGenresByAffinity,
  isGenreRecommended,
  resolveDefaultVocalGender,
} from "@/lib/wizardMappings";
import type {
  WizardMoodId,
  WizardThemeId,
  WizardGenerateRequest,
} from "@/types";
import type { GenreId } from "@/lib/turkishMusicKB";

type Props = {
  model: string;
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
};

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Duygu",
  2: "Tarz",
  3: "Tema",
  4: "Detay",
};

export default function WizardCreateForm({ model, onTaskStarted }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { credits, costs, refresh: refreshCredits } = useCredits();

  const [step, setStep] = useState<Step>(1);
  const [mood, setMood] = useState<WizardMoodId | null>(null);
  const [genreId, setGenreId] = useState<GenreId | null>(null);
  const [theme, setTheme] = useState<WizardThemeId>("ask");
  const [themeText, setThemeText] = useState("");
  const [vocalGender, setVocalGender] = useState<"m" | "f" | "instrumental">(
    "m",
  );
  const [era, setEra] = useState<"modern" | "klasik" | "90lar">("modern");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateCost = costs.generate ?? 10;
  const hasEnoughCredits = (credits?.balance ?? 0) >= generateCost;

  const sortedGenres = useMemo(
    () => (mood ? sortGenresByAffinity(mood) : GENRE_CARDS),
    [mood],
  );

  const canProceed: Record<Step, boolean> = {
    1: mood !== null,
    2: genreId !== null,
    3: theme !== null && (theme !== "custom" || themeText.trim().length > 0),
    4: true,
  };

  // Genre seçildiğinde default vokal cinsiyeti çözümle
  const handleGenrePick = (g: GenreId) => {
    setGenreId((prev) => (prev === g ? null : g));
    setVocalGender(resolveDefaultVocalGender(g));
  };

  const handleNext = () => {
    if (!canProceed[step]) return;
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!mood || !genreId) return;
    if (!hasEnoughCredits) {
      router.push("/pricing");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const body: WizardGenerateRequest = {
        mood,
        genreId,
        theme,
        themeText: themeText.trim(),
        vocalGender,
        era,
        regionId: regionId ?? undefined,
        model,
      };
      const res = await fetch("/api/wizard-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 402) {
        const e = localizeApiError(data, "Kredi yetersiz");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        router.push("/pricing");
        return;
      }
      if (!res.ok) {
        const e = localizeApiError(data, "Hata oluştu");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      const taskId = data?.data?.taskId;
      if (!taskId) {
        const e = localizeApiError(data, "Görev başlatılamadı");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      const selectedGenre = GENRE_CARDS.find((g) => g.id === genreId);
      const selectedTheme = THEME_TEMPLATES.find((t) => t.id === theme);
      onTaskStarted(
        taskId,
        themeText || selectedTheme?.contextHint || "",
        `${selectedGenre?.label ?? ""} — ${selectedTheme?.label ?? ""}`.slice(
          0,
          50,
        ),
      );
      // Reset
      setStep(1);
      setMood(null);
      setGenreId(null);
      setTheme("ask");
      setThemeText("");
      setRegionId(null);
      refreshCredits();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center gap-1.5 mb-5">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step >= s ? "bg-[#19b35c]" : "bg-[#1f1f1f]"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#666] text-[11px] uppercase tracking-wide font-medium">
            Adım {step} / 4
          </p>
          <h3 className="text-white text-[17px] font-semibold mt-0.5">
            {STEP_LABELS[step]}
          </h3>
        </div>
        {step > 1 && (
          <button
            onClick={handleBack}
            className="h-8 px-3 rounded-full bg-[#1a1a1a] hover:bg-[#222] text-[#aaa] hover:text-white flex items-center gap-1 text-[12px]"
          >
            <ChevronLeft size={13} />
            Geri
          </button>
        )}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {/* Step 1: Mood */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {MOOD_CARDS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`p-4 rounded-2xl border text-left transition-all bg-gradient-to-br ${m.gradient} ${
                  mood === m.id
                    ? "border-white shadow-lg"
                    : "border-[#1f1f1f] hover:border-[#333]"
                }`}
              >
                <p className="text-white text-[15px] font-semibold">
                  {m.label}
                </p>
                <p className="text-white/60 text-[11px] mt-1">
                  {m.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Genre */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {sortedGenres.map((g) => {
              const recommended = mood ? isGenreRecommended(mood, g.id) : false;
              return (
                <button
                  key={g.id}
                  onClick={() => handleGenrePick(g.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    genreId === g.id
                      ? "bg-white text-black border-white"
                      : "bg-[#141414] border-[#1f1f1f] hover:border-[#333]"
                  }`}
                >
                  {recommended && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#19b35c] text-black flex items-center gap-0.5">
                      <Sparkles size={8} /> ÖNERİLEN
                    </span>
                  )}
                  <p
                    className={`text-[14px] font-semibold ${
                      genreId === g.id ? "text-black" : "text-white"
                    }`}
                  >
                    {g.label}
                  </p>
                  <p
                    className={`text-[11px] mt-1 ${
                      genreId === g.id ? "text-black/60" : "text-[#666]"
                    }`}
                  >
                    {g.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Theme */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {THEME_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    theme === t.id
                      ? "bg-white text-black border-white"
                      : "bg-[#141414] border-[#1f1f1f] hover:border-[#333] text-white"
                  }`}
                >
                  <p className="text-[14px] font-semibold">{t.label}</p>
                  <p
                    className={`text-[11px] mt-1 truncate ${
                      theme === t.id ? "text-black/60" : "text-[#666]"
                    }`}
                  >
                    {t.contextHint.split(",")[0]}
                  </p>
                </button>
              ))}
            </div>
            <div>
              <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
                Özel Notlar{" "}
                <span className="text-[#666] normal-case">
                  {theme === "custom" ? "(zorunlu)" : "(opsiyonel)"}
                </span>
              </label>
              <textarea
                value={themeText}
                onChange={(e) => setThemeText(e.target.value)}
                placeholder={
                  theme === "custom"
                    ? "Şarkının konusunu kendi cümlenle yaz..."
                    : "Temayı özelleştirmek istersen buraya yaz (opsiyonel)"
                }
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#333] resize-none"
                maxLength={500}
              />
            </div>
          </div>
        )}

        {/* Step 4: Detail */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Vokal */}
            <div>
              <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
                Vokal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "f" as const, label: "Kadın" },
                  { v: "m" as const, label: "Erkek" },
                  { v: "instrumental" as const, label: "Enstrümantal" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setVocalGender(opt.v)}
                    className={`h-10 rounded-full text-[12px] font-medium transition-colors ${
                      vocalGender === opt.v
                        ? "bg-white text-black"
                        : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dönem */}
            <div>
              <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
                Dönem
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "modern" as const, label: "Modern" },
                  { v: "90lar" as const, label: "90'lar" },
                  { v: "klasik" as const, label: "Klasik" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setEra(opt.v)}
                    className={`h-10 rounded-full text-[12px] font-medium transition-colors ${
                      era === opt.v
                        ? "bg-white text-black"
                        : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bölge */}
            <div>
              <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
                Bölge{" "}
                <span className="text-[#666] normal-case">(opsiyonel)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setRegionId(null)}
                  className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                    regionId === null
                      ? "bg-white text-black"
                      : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                  }`}
                >
                  Yok
                </button>
                {REGION_CARDS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRegionId(regionId === r.id ? null : r.id)}
                    className={`px-3 py-1.5 rounded-full text-[12px] transition-colors flex items-center gap-1 ${
                      regionId === r.id
                        ? "bg-white text-black"
                        : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                    }`}
                  >
                    {regionId === r.id && <Check size={10} />}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Özet */}
            <div className="px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] space-y-1">
              <p className="text-[#666] text-[11px] uppercase tracking-wide">
                Özet
              </p>
              <p className="text-white text-[12px]">
                {MOOD_CARDS.find((m) => m.id === mood)?.label} ·{" "}
                {GENRE_CARDS.find((g) => g.id === genreId)?.label} ·{" "}
                {THEME_TEMPLATES.find((t) => t.id === theme)?.label}
              </p>
              <p className="text-[#666] text-[11px]">
                Yapay zeka duyguna ve tarzına uygun sözler ve melodi üretir.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-[13px] mt-4">{error}</p>}

      {/* Bottom action */}
      <div className="mt-5">
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed[step]}
            className="w-full h-12 rounded-full bg-white text-black text-[14px] font-semibold hover:bg-[#eee] disabled:bg-[#1f1f1f] disabled:text-[#666] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            İleri
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !mood || !genreId}
            className={`w-full h-12 rounded-full flex items-center justify-center gap-2 text-[14px] font-semibold transition-all ${
              !hasEnoughCredits
                ? "bg-[#2a2a2a] text-white hover:bg-[#333]"
                : "text-white hover:opacity-90"
            }`}
            style={
              hasEnoughCredits
                ? {
                    background:
                      "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)",
                  }
                : undefined
            }
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : !hasEnoughCredits ? (
              <>
                <Lock size={14} />
                Krediyi Yükselt ({generateCost} kredi gerekli)
              </>
            ) : (
              <>
                <Music2 size={15} />
                Sihirli Oluştur · {generateCost} kredi
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
