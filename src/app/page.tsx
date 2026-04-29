"use client";

import { useRef, useState } from "react";
import { Mic2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUpload } from "@/contexts/UploadContext";
import PersonalSongModal from "@/components/PersonalSongModal";

type OccasionCardId =
  | "dogum_gunu"
  | "anneler_gunu"
  | "yil_donumu"
  | "babalar_gunu"
  | "sevgililer_gunu"
  | "bebek_hosgeldin"
  | "asker_ugurlama"
  | "dugun_nisan"
  | "ninni";

const OCCASION_CARDS: Array<{
  id: OccasionCardId;
  icon: string;
  label: string;
  desc: string;
}> = [
  { id: "dogum_gunu", icon: "🎂", label: "Doğum Günü", desc: "Adıyla özel" },
  { id: "anneler_gunu", icon: "👩", label: "Anneye", desc: "Sıcak duygular" },
  { id: "yil_donumu", icon: "💍", label: "Yıldönümü", desc: "Birlikte yıllar" },
  { id: "babalar_gunu", icon: "👨", label: "Babaya", desc: "Minnet dolu" },
  { id: "sevgililer_gunu", icon: "❤️", label: "Sevgiliye", desc: "Romantik" },
  { id: "bebek_hosgeldin", icon: "👶", label: "Bebeğe", desc: "Hoşgeldin" },
  { id: "dugun_nisan", icon: "👰", label: "Düğün", desc: "İki isim" },
  { id: "asker_ugurlama", icon: "🪖", label: "Askere", desc: "Sağ salim dön" },
  { id: "ninni", icon: "🌙", label: "Ninni", desc: "Yumuşak uyutucu" },
];

export default function HomePage() {
  const router = useRouter();
  const { setPending: setPendingUpload, openRecord } = useUpload();
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [pickedOccasion, setPickedOccasion] = useState<OccasionCardId | null>(
    null,
  );

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

        <div className="relative pt-[80px] pb-[80px] px-[20px] flex flex-col items-center">
          <h1 className="text-white text-[28px] md:text-[36px] font-bold text-center leading-[1.2] mb-[28px]">
            Hayalindeki şarkıyı
            <br />
            duymanın zamanı
          </h1>

          <input
            ref={heroFileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleHeroFilePick}
          />

          <p className="text-[#bbb] text-[14px] md:text-[15px] text-center mb-5 max-w-[520px] leading-relaxed">
            Kime şarkı yapmak istiyorsun? Bir vesile seç, gerisini biz
            halledelim.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-[640px] w-full">
            {OCCASION_CARDS.map((c) => (
              <button
                key={c.id}
                onClick={() => setPickedOccasion(c.id)}
                className="group relative bg-[#161616]/90 backdrop-blur-xl border border-[#1f1f1f] rounded-[18px] p-4 md:p-5 flex flex-col items-center gap-1.5 hover:border-[#19b35c]/40 hover:bg-[#1a1a1a] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-black/30"
              >
                <span className="text-[28px] md:text-[32px] mb-1 group-hover:scale-110 transition-transform">
                  {c.icon}
                </span>
                <span className="text-white text-[13px] md:text-[14px] font-semibold leading-tight">
                  {c.label}
                </span>
                <span className="text-[#666] text-[10px] md:text-[11px] leading-tight">
                  {c.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
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
