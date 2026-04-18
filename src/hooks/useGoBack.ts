"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Güvenli geri gitme hook'u.
 * History varsa `router.back()`, yoksa fallback'e (`/`) yönlendirir.
 * Deep link / yeni tab / paylaşılan link durumlarında boş sayfaya düşmeyi önler.
 */
export function useGoBack(fallback = "/") {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [router, fallback]);
}
