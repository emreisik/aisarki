"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Song } from "@/types";

interface Line {
  time: number;
  text: string;
}

/**
 * LRC formatını parse et: "[mm:ss.xx]text" satırlarını { time, text } dizisine çevir.
 * Metadata satırları ([ti:], [ar:], vs.) atlanır.
 */
function parseLrc(lrc: string): Line[] {
  const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g;
  const lines: Line[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line) continue;
    // Pure metadata satırı — zaman damgası olmadan sadece [key:value]
    if (/^\[(ti|ar|al|by|length|offset):/i.test(line)) continue;

    const stamps: number[] = [];
    TIMESTAMP_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TIMESTAMP_RE.exec(line))) {
      const mm = parseInt(match[1], 10);
      const ss = parseFloat(match[2]);
      stamps.push(mm * 60 + ss);
    }
    if (stamps.length === 0) continue;

    const text = line.replace(TIMESTAMP_RE, "").trim();
    if (!text) continue;
    for (const t of stamps) lines.push({ time: t, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

function findActiveIndex(lines: Line[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

interface AlignedWord {
  word: string;
  startS: number;
  endS: number;
  success?: boolean;
}

type Props = {
  song: Song;
  /** LRC metni — yoksa fallback lyrics render edilir */
  lrc?: string;
  /** Suno word-level lyrics — varsa LRC'den önceliklidir (kelime-kelime karaoke) */
  alignedWords?: AlignedWord[];
  /** Fallback sözler (LRC yoksa veya şarkı aktif player'da değilse) */
  fallback?: string | null;
};

/**
 * AlignedWords'ten line-level Line[] üret.
 * Suno cümleleri zaten ayırmış olmuyor — kelimeleri yeni satırla
 * ayırıyor ("\n" word olarak gelir). Boş kelime = satır sonu.
 */
function alignedWordsToLines(words: AlignedWord[]): Line[] {
  const lines: Line[] = [];
  let buffer: string[] = [];
  let bufferStart: number | null = null;
  for (const w of words) {
    const text = (w.word ?? "").trim();
    const isBreak = text === "" || text === "\n";
    if (isBreak) {
      if (bufferStart !== null && buffer.length > 0) {
        lines.push({ time: bufferStart, text: buffer.join(" ").trim() });
      }
      buffer = [];
      bufferStart = null;
      continue;
    }
    if (bufferStart === null) bufferStart = w.startS;
    buffer.push(text);
  }
  if (bufferStart !== null && buffer.length > 0) {
    lines.push({ time: bufferStart, text: buffer.join(" ").trim() });
  }
  return lines;
}

/** Word-level: t saniyesindeki aktif kelime indeksi */
function findActiveWordIndex(words: AlignedWord[], t: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].startS <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export default function KaraokeLyrics({
  song,
  lrc,
  alignedWords,
  fallback,
}: Props) {
  const { currentSong, currentTime, audioRef } = usePlayer();
  const lines = useMemo(() => {
    if (alignedWords && alignedWords.length > 0)
      return alignedWordsToLines(alignedWords);
    return lrc ? parseLrc(lrc) : [];
  }, [lrc, alignedWords]);
  const isActiveInPlayer = currentSong?.id === song.id;
  const activeIdx = useMemo(
    () => (isActiveInPlayer ? findActiveIndex(lines, currentTime) : -1),
    [lines, currentTime, isActiveInPlayer],
  );
  const activeWordIdx = useMemo(
    () =>
      isActiveInPlayer && alignedWords
        ? findActiveWordIndex(alignedWords, currentTime)
        : -1,
    [alignedWords, currentTime, isActiveInPlayer],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  // Aktif satıra smooth scroll — kullanıcı scroll edince 4 sn durdur
  useEffect(() => {
    if (!autoScroll || activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    const container = containerRef.current;
    if (!el || !container) return;
    const target =
      el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [activeIdx, autoScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      setAutoScroll(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => setAutoScroll(true), 4000);
    };
    container.addEventListener("wheel", onScroll, { passive: true });
    container.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", onScroll);
      container.removeEventListener("touchmove", onScroll);
      if (t) clearTimeout(t);
    };
  }, []);

  // Fallback: LRC yok → eski LyricsBlock mantığı
  if (lines.length === 0) {
    const trimmed = fallback?.trim() ?? "";
    if (!trimmed) {
      return (
        <div className="text-[#6a6a6a] text-sm italic py-8 text-center">
          Sözler bu şarkı için mevcut değil.
        </div>
      );
    }
    const fallbackLines = trimmed.split(/\r?\n/);
    return (
      <div className="font-normal text-[#cfcfcf] text-[15px] leading-relaxed whitespace-pre-wrap">
        {fallbackLines.map((line, i) => {
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
          if (!line.trim()) return <div key={i} className="h-3" />;
          return <div key={i}>{line}</div>;
        })}
      </div>
    );
  }

  const handleLineClick = (t: number) => {
    if (!isActiveInPlayer) return; // Sadece aktif şarkıda seek çalışır
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, t - 0.05);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#1db954] text-[11px] font-bold uppercase tracking-widest">
            Senkron Sözler
          </span>
          {alignedWords && alignedWords.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#19b35c]/15 text-[#19b35c] tracking-wide">
              KELİME-KELİME
            </span>
          )}
        </div>
        {!isActiveInPlayer && (
          <span className="text-[#555] text-[11px]">
            Senkron için şarkıyı çal
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="max-h-[420px] overflow-y-auto scrollbar-thin pr-2 -mr-2"
      >
        <div className="flex flex-col">
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            const nextLineTime = lines[i + 1]?.time ?? Infinity;
            // Sadece aktif satırda + word data varsa kelime-kelime highlight
            const lineWords =
              isActive && alignedWords
                ? alignedWords.filter(
                    (w) =>
                      w.startS >= line.time &&
                      w.startS < nextLineTime &&
                      (w.word ?? "").trim() !== "" &&
                      (w.word ?? "") !== "\n",
                  )
                : null;
            return (
              <button
                key={`${line.time}-${i}`}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                onClick={() => handleLineClick(line.time)}
                disabled={!isActiveInPlayer}
                className={`text-left py-2 transition-all duration-200 leading-[26px] ${
                  isActive
                    ? "text-white text-[18px] font-semibold scale-[1.02]"
                    : isPast
                      ? "text-[#5a5a5a] text-[15px]"
                      : "text-[#9a9a9a] text-[15px]"
                } ${isActiveInPlayer ? "cursor-pointer hover:text-white" : "cursor-default"}`}
              >
                {lineWords && lineWords.length > 0 ? (
                  <span>
                    {lineWords.map((w, wi) => {
                      const wIdx = alignedWords!.indexOf(w);
                      const isWordPast = wIdx < activeWordIdx;
                      const isWordActive = wIdx === activeWordIdx;
                      return (
                        <span
                          key={`${line.time}-${wi}`}
                          className={`inline-block transition-colors duration-150 ${
                            isWordActive
                              ? "text-[#fcff9a]"
                              : isWordPast
                                ? "text-white"
                                : "text-white/60"
                          }`}
                        >
                          {w.word}
                          {wi < lineWords.length - 1 ? " " : ""}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  line.text
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
