/**
 * Hafif haptic feedback yardımcısı.
 * Android ve bazı Android-on-iOS browser'larda çalışır;
 * iOS Safari'de sessizce no-op olur.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // bazı tarayıcılar user gesture olmadan reddeder — yutuyoruz
  }
}

export const haptics = {
  /** Buton/kart dokunuşu — kısa, hafif tap */
  tap: () => vibrate(8),
  /** Sekme/kategori değişimi — iki kısa tık */
  selection: () => vibrate([4, 4, 4]),
  /** Modal açılışı — orta kısa */
  open: () => vibrate(12),
  /** Başarılı işlem — uzun + tık */
  success: () => vibrate([12, 40, 30]),
  /** Hata/uyarı — çift uzun */
  error: () => vibrate([40, 30, 40]),
  /** Pull-to-refresh tetiklendiğinde */
  refresh: () => vibrate([10, 20, 10]),
};
