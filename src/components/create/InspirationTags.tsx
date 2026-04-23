"use client";

const POOL = [
  "pulsing rhythms",
  "raï",
  "sarcastic",
  "slow metal",
  "gospel music",
  "dark trap",
  "synthwave",
  "dreamy indie",
  "arabesk",
  "türkü",
  "turkish pop",
  "acoustic folk",
  "orchestral",
  "anatolian rock",
  "lo-fi chill",
  "afrobeats",
  "drill",
  "hyperpop",
  "jazz fusion",
  "boom bap",
  "dark ambient",
  "epic cinematic",
  "bossa nova",
  "country ballad",
  "reggaeton",
  "electro swing",
];

// Deterministic per-day sample — aynı gün aynı tag set'i; sonraki gün yenilenir
function sampleForToday(count = 8): string[] {
  const day = Math.floor(Date.now() / 86400000);
  const shuffled = [...POOL].sort(
    (a, b) =>
      Math.sin((a.charCodeAt(0) + day) * 17) -
      Math.sin((b.charCodeAt(0) + day) * 17),
  );
  return shuffled.slice(0, count);
}

type Props = {
  onPick: (tag: string) => void;
};

export default function InspirationTags({ onPick }: Props) {
  const tags = sampleForToday(8);
  return (
    <div className="pt-4 border-t border-[#2a2a2a] mt-4">
      <div className="text-[#888] text-[12px] mb-2">İlham</div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => onPick(t)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] transition-colors whitespace-nowrap"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
