/**
 * Next.js instrumentation — process boot hook (server-side only).
 * Railway Node runtime'da uygulama ayağa kalkınca bir kez çalışır.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startStatsCron } = await import("./src/lib/statsCron");
  startStatsCron();
}
