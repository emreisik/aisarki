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

type Props = {
  song: Song;
  /** LRC metni — yoksa fallback lyrics render edilir */
  lrc?: string;
  /** Fallback sözler (LRC yoksa veya şarkı aktif player'da değilse) */
  fallback?: string | null;
};

export default function KaraokeLyrics({ song, lrc, fallback }: Props) {
  const { currentSong, currentTime, audioRef } = usePlayer();
  const lines = useMemo(() => (lrc ? parseLrc(lrc) : []), [lrc]);
  const isActiveInPlayer = currentSong?.id === song.id;
  const activeIdx = useMemo(
    () => (isActiveInPlayer ? findActiveIndex(lines, currentTime) : -1),
    [lines, currentTime, isActiveInPlayer],
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
        <span className="text-[#1db954] text-[11px] font-bold uppercase tracking-widest">
          Senkron Sözler
        </span>
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
                {line.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
