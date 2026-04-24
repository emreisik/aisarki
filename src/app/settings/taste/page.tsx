"use client";

import { useEffect, useState } from "react";
import { Heart, Check, Sparkles, Loader2 } from "lucide-react";
import SettingsShell from "@/components/SettingsShell";

const TASTE_KEY = "rifmo_taste";

const GENRES = [
  "Türk Pop",
  "Arabesk",
  "Türk Halk",
  "Türk Rock",
  "Türk Rap",
  "Pop",
  "Rock",
  "Hip-Hop",
  "R&B",
  "Lo-fi",
  "Elektronik",
  "House",
  "Techno",
  "Klasik",
  "Caz",
  "Akustik",
  "Folk",
  "Sufi & İlahi",
  "Indie",
  "Synthwave",
  "Metal",
  "Reggae",
  "Latin",
  "K-pop",
];

const MOODS = [
  "Mutlu",
  "Hüzünlü",
  "Enerjik",
  "Sakin",
  "Romantik",
  "Nostaljik",
  "Motivasyon",
  "Karanlık",
  "Hayalperest",
  "Öfkeli",
];

const ERAS = [
  "60'lar",
  "70'ler",
  "80'ler",
  "90'lar",
  "2000'ler",
  "2010'lar",
  "Modern",
];

const LANGUAGES = ["Türkçe", "İngilizce", "İspanyolca", "Korece", "Arapça"];

interface Taste {
  genres: string[];
  moods: string[];
  eras: string[];
  languages: string[];
}

const EMPTY: Taste = { genres: [], moods: [], eras: [], languages: [] };

export default function TastePage() {
  const [taste, setTaste] = useState<Taste>(EMPTY);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASTE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Taste>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTaste({
          genres: parsed.genres ?? [],
          moods: parsed.moods ?? [],
          eras: parsed.eras ?? [],
          languages: parsed.languages ?? [],
        });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TASTE_KEY, JSON.stringify(taste));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedAt(Date.now());
    } catch {
      /* ignore */
    }
  }, [taste, hydrated]);

  const toggle = (key: keyof Taste, value: string) => {
    setTaste((prev) => {
      const list = prev[key];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const totalCount =
    taste.genres.length +
    taste.moods.length +
    taste.eras.length +
    taste.languages.length;

  return (
    <SettingsShell
      title="Müzik Zevkim"
      description="Önerilerini ve oluşturulan şarkıları zevkine göre kişiselleştir"
    >
      {!hydrated ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#888]" />
        </div>
      ) : (
        <>
          {/* Banner */}
          <div className="bg-gradient-to-r from-[#1db954]/15 to-[#1db954]/5 border border-[#1db954]/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1db954]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-[#1ed760]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-semibold">
                {totalCount > 0
                  ? `${totalCount} tercih kaydedildi`
                  : "Birkaç tercih seç — öneriler kişiselleşsin"}
              </p>
              <p className="text-[#888] text-[12px] mt-0.5">
                Seçimlerin otomatik kaydediliyor
                {savedAt && totalCount > 0 ? " · senkronize" : ""}
              </p>
            </div>
            {savedAt && totalCount > 0 && (
              <Check size={18} className="text-[#1ed760] flex-shrink-0" />
            )}
          </div>

          <Section
            title="Favori türler"
            description="Birden fazla seçebilirsin"
            items={GENRES}
            selected={taste.genres}
            onToggle={(v) => toggle("genres", v)}
            color="#1db954"
          />

          <Section
            title="Ruh hali"
            description="Hangi modda dinlemekten hoşlanırsın"
            items={MOODS}
            selected={taste.moods}
            onToggle={(v) => toggle("moods", v)}
            color="#8b5cf6"
          />

          <Section
            title="Dönem"
            description="Hangi dönemler ilgini çekiyor"
            items={ERAS}
            selected={taste.eras}
            onToggle={(v) => toggle("eras", v)}
            color="#f59e0b"
          />

          <Section
            title="Diller"
            description="Sözlerin hangi dillerde olmasını tercih edersin"
            items={LANGUAGES}
            selected={taste.languages}
            onToggle={(v) => toggle("languages", v)}
            color="#3b82f6"
          />

          {totalCount > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setTaste(EMPTY)}
                className="text-[#888] hover:text-white text-[13px] font-medium transition-colors flex items-center gap-1.5 pressable"
              >
                Tüm seçimleri temizle
              </button>
            </div>
          )}
        </>
      )}
    </SettingsShell>
  );
}

function Section({
  title,
  description,
  items,
  selected,
  onToggle,
  color,
}: {
  title: string;
  description: string;
  items: string[];
  selected: string[];
  onToggle: (v: string) => void;
  color: string;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Heart size={14} style={{ color }} />
        <h3 className="text-white text-[14px] font-bold">{title}</h3>
        {selected.length > 0 && (
          <span className="text-[#888] text-[12px]">· {selected.length}</span>
        )}
      </div>
      <p className="text-[#666] text-[12px] mb-3 px-1">{description}</p>

      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const active = selected.includes(it);
          return (
            <button
              key={it}
              onClick={() => onToggle(it)}
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all pressable border"
              style={
                active
                  ? {
                      background: color,
                      color: "#000",
                      borderColor: color,
                      boxShadow: `0 4px 16px ${color}30`,
                    }
                  : {
                      background: "#141414",
                      color: "#ddd",
                      borderColor: "#2a2a2a",
                    }
              }
            >
              {it}
            </button>
          );
        })}
      </div>
    </section>
  );
}
