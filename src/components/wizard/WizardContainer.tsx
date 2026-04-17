"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Loader2, ChevronLeft } from "lucide-react";
import type { WizardMoodId, WizardThemeId, SunoApiResponse } from "@/types";
import { resolveDefaultVocalGender } from "@/lib/wizardMappings";
import type { GenreId } from "@/lib/turkishMusicKB";
import WizardProgress from "./WizardProgress";
import WizardStepMood from "./WizardStepMood";
import WizardStepGenre from "./WizardStepGenre";
import WizardStepTheme from "./WizardStepTheme";
import WizardStepDetails from "./WizardStepDetails";
import WizardPreview from "./WizardPreview";

interface WizardContainerProps {
  onTaskStarted: (
    taskId: string,
    prompt: string,
    title: string,
    streamUrl?: string,
    songId?: string,
  ) => void;
  model: string;
  disabled?: boolean;
}

const TOTAL_STEPS = 4;

export default function WizardContainer({
  onTaskStarted,
  model,
  disabled,
}: WizardContainerProps) {
  const { data: session } = useSession();
  const { setShowGate } = usePlayer();

  const [step, setStep] = useState(1);
  const [mood, setMood] = useState<WizardMoodId | null>(null);
  const [genreId, setGenreId] = useState<string | null>(null);
  const [theme, setTheme] = useState<WizardThemeId | null>(null);
  const [themeText, setThemeText] = useState("");
  const [vocalGender, setVocalGender] = useState<"m" | "f" | "instrumental">(
    "m",
  );
  const [era, setEra] = useState<"modern" | "klasik" | "90lar">("modern");
  const [regionId, setRegionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return mood !== null;
      case 2:
        return genreId !== null;
      case 3:
        return theme !== null || themeText.trim().length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (step === 2 && genreId) {
      // Genre seçildiğinde default vokal cinsiyetini ayarla
      setVocalGender(resolveDefaultVocalGender(genreId as GenreId));
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  const handleGenerate = async () => {
    if (!session?.user) {
      setShowGate(true);
      return;
    }
    if (!mood || !genreId) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/wizard-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          genreId,
          theme: theme || "custom",
          themeText: themeText.trim(),
          vocalGender,
          era,
          regionId: regionId || undefined,
          model,
        }),
      });

      const data: SunoApiResponse = await res.json();

      if (!res.ok) {
        setError(
          (data as unknown as { error?: string }).error || "Hata oluştu",
        );
        return;
      }

      const taskId = data.data?.taskId;
      if (!taskId) {
        setError(
          (data as unknown as { error?: string }).error ||
            data.msg ||
            "Görev başlatılamadı",
        );
        return;
      }

      const sunoSongs = data.data?.sunoData;
      const firstSong = sunoSongs?.[0];
      const streamUrl = firstSong?.stream_audio_url;
      const songId = firstSong?.id;

      onTaskStarted(
        taskId,
        themeText.trim() || mood,
        themeText.trim().slice(0, 40) || mood,
        streamUrl,
        songId,
      );

      // Reset wizard
      setStep(1);
      setMood(null);
      setGenreId(null);
      setTheme(null);
      setThemeText("");
      setVocalGender("m");
      setEra("modern");
      setRegionId(null);
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <WizardProgress currentStep={step} totalSteps={TOTAL_STEPS} />

      {/* Adım içeriği */}
      <div className="min-h-[280px]">
        {step === 1 && (
          <WizardStepMood
            selected={mood}
            onSelect={(m) => {
              setMood(m);
              // Otomatik ilerle
              setTimeout(() => setStep(2), 200);
            }}
          />
        )}
        {step === 2 && mood && (
          <WizardStepGenre
            selected={genreId}
            mood={mood}
            onSelect={(g) => {
              setGenreId(g);
              setVocalGender(resolveDefaultVocalGender(g as GenreId));
              setTimeout(() => setStep(3), 200);
            }}
          />
        )}
        {step === 3 && (
          <WizardStepTheme
            selected={theme}
            themeText={themeText}
            onSelect={setTheme}
            onTextChange={setThemeText}
          />
        )}
        {step === 4 && (
          <WizardStepDetails
            vocalGender={vocalGender}
            era={era}
            regionId={regionId}
            genreId={genreId}
            onVocalChange={setVocalGender}
            onEraChange={setEra}
            onRegionChange={setRegionId}
          />
        )}
      </div>

      {/* Önizleme — adım 3+ ve seçimler tamamsa */}
      {step >= 3 && mood && genreId && (
        <WizardPreview
          mood={mood}
          genreId={genreId}
          theme={theme}
          themeText={themeText}
          vocalGender={vocalGender}
          era={era}
          regionId={regionId}
        />
      )}

      {/* Hata */}
      {error && (
        <p className="text-red-400 text-sm text-center py-1">{error}</p>
      )}

      {/* Navigasyon */}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-full bg-[#1a1a1a] text-[#aaa] text-[13px] font-semibold hover:text-white transition-colors pressable disabled:opacity-30"
          >
            <ChevronLeft size={14} />
            Geri
          </button>
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance()}
            className={`flex-1 py-3 rounded-full font-bold text-[14px] transition-all pressable ${
              canAdvance()
                ? "bg-white text-black hover:bg-[#e0e0e0] active:scale-[0.98]"
                : "bg-[#1a1a1a] text-[#555]"
            }`}
          >
            Devam
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || disabled || !canAdvance()}
            className={`flex-1 py-3.5 rounded-full font-bold text-[15px] transition-all pressable ${
              loading || disabled
                ? "bg-[#1a1a1a] text-[#555]"
                : "bg-[#1db954] hover:bg-[#1ed760] text-black active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Hazırlanıyor...
              </span>
            ) : (
              "Oluştur"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
