/**
 * Spotify tarzı dinleyici/stream sayısı formatlama (tr-TR).
 *   139438 → "139.438"
 *   1234567 → "1,2 Mn"
 *   2500000000 → "2,5 Mr"
 */
export function formatListenerCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "0";
  if (n < 1_000) return String(Math.floor(n));
  if (n < 1_000_000)
    return new Intl.NumberFormat("tr-TR").format(Math.floor(n));
  if (n < 1_000_000_000) {
    const v = n / 1_000_000;
    return `${v.toFixed(v < 10 ? 1 : 0).replace(".", ",")} Mn`;
  }
  const v = n / 1_000_000_000;
  return `${v.toFixed(v < 10 ? 1 : 0).replace(".", ",")} Mr`;
}

/** Kısa varyant: sadece sayı, "dinlenme" etiketi çağıran yerde eklenir. */
export function formatPlayCount(n: number | null | undefined): string {
  return formatListenerCount(n);
}
