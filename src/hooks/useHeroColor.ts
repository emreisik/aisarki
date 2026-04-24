"use client";

import { useEffect, useState } from "react";

/**
 * Verilen görsel URL'lerinden dominant RGB rengini çıkarır.
 * Profile banner, song detay gibi hero alanlarında gradient için kullanılır.
 *
 * Dönen değer: "r,g,b" string'i (CSS rgb() içine hazır).
 */
export function useHeroColor(...urls: (string | undefined | null)[]): string {
  const [rgb, setRgb] = useState("30,30,40");
  const src = urls.find(Boolean) as string | undefined;

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const rp = data[i];
          const gp = data[i + 1];
          const bp = data[i + 2];
          // Aşırı koyu ve aşırı açık piksel'leri at
          const brightness = (rp + gp + bp) / 3;
          if (brightness < 20 || brightness > 235) continue;
          r += rp;
          g += gp;
          b += bp;
          count++;
        }
        if (count === 0) return;
        // Hero için biraz koyult — kontrastı artırır
        const dim = 0.55;
        setRgb(
          `${Math.round((r / count) * dim)},${Math.round((g / count) * dim)},${Math.round((b / count) * dim)}`,
        );
      } catch {
        /* CORS vs — sessiz fallback */
      }
    };
    img.src = src;
  }, [src]);

  return rgb;
}
