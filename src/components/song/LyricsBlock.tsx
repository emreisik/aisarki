"use client";

/** Sözler — Suno tarzı [Intro] / [Verse] / [Chorus] tag'li pre-formatted blok.
 *  `prompt` null/boş ise "Sözler yok" gösterir. */
export default function LyricsBlock({ text }: { text?: string | null }) {
  const trimmed = text?.trim() ?? "";

  if (!trimmed) {
    return (
      <div className="text-[#6a6a6a] text-sm italic py-8 text-center">
        Sözler bu şarkı için mevcut değil.
      </div>
    );
  }

  // [Tag] formatını yakalayıp stilize et
  const lines = trimmed.split(/\r?\n/);

  return (
    <div className="font-normal text-[#cfcfcf] text-[15px] leading-relaxed whitespace-pre-wrap">
      {lines.map((line, i) => {
        const tagMatch = line.match(/^\s*\[(.+?)\]\s*$/);
        if (tagMatch) {
          return (
            <div
              key={i}
              className="text-[#1db954] font-bold text-xs uppercase tracking-widest mt-5 mb-1"
            >
              [{tagMatch[1]}]
            </div>
          );
        }
        if (!line.trim()) {
          return <div key={i} className="h-3" />;
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}
