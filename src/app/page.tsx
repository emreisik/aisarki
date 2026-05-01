"use client";

import { useRef, useState } from "react";
import { Mic2, Upload } from "lucide-react";
import { Star, MusicNotes, Clock } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUpload } from "@/contexts/UploadContext";
import PersonalSongModal from "@/components/PersonalSongModal";
import {
  OCCASIONS,
  OCCASION_CATEGORIES,
  type OccasionId,
} from "@/lib/occasions";
import { OccasionIcon, CategoryIcon } from "@/lib/occasionIcons";

export default function HomePage() {
  const router = useRouter();
  const { setPending: setPendingUpload, openRecord } = useUpload();
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [pickedOccasion, setPickedOccasion] = useState<OccasionId | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    OCCASION_CATEGORIES[0].id,
  );

  const currentCategory =
    OCCASION_CATEGORIES.find((c) => c.id === activeCategory) ??
    OCCASION_CATEGORIES[0];

  const handleHeroFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUpload({ file, startedAt: Date.now() });
    e.target.value = "";
    router.push("/create");
  };

  return (
    <div className="min-h-full bg-[#121212]">
      <div
        className="relative overflow-hidden"
        style={{ background: "#06140c" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="hero-neon hero-neon-1" />
          <div className="hero-neon hero-neon-2" />
          <div className="hero-neon hero-neon-3" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, transparent 0%, #121212 75%)",
            }}
          />
        </div>

        <div className="relative pt-[64px] md:pt-[80px] pb-[64px] md:pb-[80px] px-[20px] flex flex-col items-center">
          <h1 className="text-white text-[28px] md:text-[44px] font-bold text-center leading-[1.1] mb-3 tracking-tight">
            Hayalindeki şarkıyı
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #fcff9a 0%, #19b35c 60%, #295b53 100%)",
              }}
            >
              duymanın zamanı
            </span>
          </h1>

          <p className="text-[#bbb] text-[14px] md:text-[16px] text-center mb-5 max-w-[560px] leading-relaxed">
            Sevdiklerine özel, adıyla ve hatıralarıyla — 3 dakikada hazır.
          </p>

          {/* Sosyal kanıt rozeti */}
          <div className="flex items-center gap-4 md:gap-6 mb-8 px-5 py-2.5 rounded-full bg-[#0a0a0a]/70 border border-[#1f1f1f] backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <MusicNotes
                size={14}
                weight="duotone"
                className="text-[#19b35c]"
              />
              <span className="text-white text-[12px] md:text-[13px] font-semibold tabular-nums">
                50K+
              </span>
              <span className="text-[#888] text-[11px] md:text-[12px]">
                şarkı
              </span>
            </div>
            <div className="w-px h-3.5 bg-[#1f1f1f]" />
            <div className="flex items-center gap-1.5">
              <Star size={14} weight="fill" className="text-[#fcff9a]" />
              <span className="text-white text-[12px] md:text-[13px] font-semibold tabular-nums">
                4.9
              </span>
              <span className="text-[#888] text-[11px] md:text-[12px]">
                puan
              </span>
            </div>
            <div className="w-px h-3.5 bg-[#1f1f1f]" />
            <div className="flex items-center gap-1.5">
              <Clock size={14} weight="duotone" className="text-[#19b35c]" />
              <span className="text-white text-[12px] md:text-[13px] font-semibold">
                ~3 dk
              </span>
            </div>
          </div>

          <input
            ref={heroFileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleHeroFilePick}
          />

          {/* Kategori sekmeleri */}
          <div className="w-full max-w-[760px] mb-5">
            <div className="flex gap-2 overflow-x-auto scroll-area pb-2 justify-start md:justify-center">
              {OCCASION_CATEGORIES.map((cat) => {
                const active = cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 h-9 rounded-full text-[12px] md:text-[13px] font-semibold whitespace-nowrap transition-all ${
                      active
                        ? "bg-[#19b35c] text-black shadow-lg shadow-[#19b35c]/20"
                        : "bg-[#161616] border border-[#222] text-[#bbb] hover:bg-[#1c1c1c] hover:text-white"
                    }`}
                  >
                    <CategoryIcon
                      id={cat.id}
                      size={15}
                      weight={active ? "fill" : "duotone"}
                    />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vesile grid — aktif kategoriye göre */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-[760px] w-full">
            {currentCategory.occasions.map((occId) => {
              const occ = OCCASIONS[occId];
              if (!occ) return null;
              return (
                <button
                  key={occId}
                  onClick={() => setPickedOccasion(occId)}
                  className="group relative bg-[#161616]/90 backdrop-blur-xl border border-[#1f1f1f] rounded-[18px] p-4 md:p-5 flex flex-col items-center gap-2 hover:border-[#19b35c]/40 hover:bg-[#1a1a1a] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-black/30 min-h-[120px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#19b35c]/15 to-[#19b35c]/5 border border-[#19b35c]/20 flex items-center justify-center text-[#19b35c] group-hover:scale-110 group-hover:from-[#19b35c]/25 group-hover:to-[#19b35c]/10 transition-all">
                    <OccasionIcon id={occId} size={26} weight="duotone" />
                  </div>
                  <span className="text-white text-[12.5px] md:text-[13.5px] font-semibold leading-tight text-center">
                    {occ.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Alternatif giriş chip'leri */}
          <div className="flex items-center gap-2 mt-7 flex-wrap justify-center">
            <button
              onClick={openRecord}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#1a1a1a]/60 border border-[#2a2a2a] text-[#aaa] text-[11px] font-medium hover:bg-[#222] hover:text-white transition-colors"
            >
              <Mic2 size={12} />
              Kayıt yap
            </button>
            <button
              onClick={() => heroFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#1a1a1a]/60 border border-[#2a2a2a] text-[#aaa] text-[11px] font-medium hover:bg-[#222] hover:text-white transition-colors"
            >
              <Upload size={12} />
              Dosya yükle
            </button>
            <Link
              href="/create"
              className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#1a1a1a]/60 border border-[#2a2a2a] text-[#aaa] text-[11px] font-medium hover:bg-[#222] hover:text-white transition-colors"
            >
              Gelişmiş seçenekler
            </Link>
          </div>
        </div>
      </div>

      <PersonalSongModal
        open={pickedOccasion !== null}
        occasion={pickedOccasion}
        onClose={() => setPickedOccasion(null)}
      />
    </div>
  );
}
