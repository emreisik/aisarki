import { recomputeStats } from "./taskStore";

declare global {
  // eslint-disable-next-line no-var
  var __statsCronStarted: boolean | undefined;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 60 * 1000;

/**
 * Process başına bir kez çağrılır — stats denormalize'ını arka planda
 * 6 saatte bir çalıştırır. Railway tek instance olduğu için race yok;
 * çoklu instance varsa idempotent (UPDATE'ler clash etmez).
 */
export function startStatsCron() {
  if (global.__statsCronStarted) return;
  global.__statsCronStarted = true;

  const run = async () => {
    try {
      const r = await recomputeStats();
      console.log(
        `[cron][stats] recomputed users=${r.usersUpdated} songs=${r.songsUpdated}`,
      );
    } catch (e) {
      console.warn("[cron][stats] error:", e);
    }
  };

  // Boot'tan 60sn sonra ilk tick (uygulama ısınsın)
  setTimeout(run, BOOT_DELAY_MS);
  setInterval(run, SIX_HOURS_MS);
}
