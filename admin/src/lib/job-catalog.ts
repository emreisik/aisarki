export interface JobDefinition {
  name: string; // job_runs.job_name ile eşleşir
  title: string;
  description: string;
  category: "ops" | "maintenance" | "debug" | "smoke";
  dryRunCommand?: string;
  executeCommand: string;
  dangerous?: boolean; // UI'da kırmızı badge
  requiresArg?: boolean; // check-song/check-user
}

/**
 * 10 script'lik katalog. Run history script'in job_runs'a yazdığı
 * `job_name` alanı üzerinden eşleşir.
 */
export const JOBS: JobDefinition[] = [
  {
    name: "audit-songs",
    title: "Audit songs",
    description:
      "DB genelinde şarkı durumu: kaçı Bunny'de, kaçı hala Suno'da, kırık kayıtlar.",
    category: "maintenance",
    executeCommand: "node --env-file=.env.local scripts/audit-songs.mjs",
  },
  {
    name: "backfill-bunny",
    title: "Backfill Bunny",
    description:
      "audio_key NULL olan eski şarkıları Suno'dan indirip Bunny'e yükler.",
    category: "ops",
    dryRunCommand:
      "node --env-file=.env.local scripts/backfill-bunny.mjs --dry-run",
    executeCommand:
      "node --env-file=.env.local scripts/backfill-bunny.mjs --limit=50",
    dangerous: true,
  },
  {
    name: "refresh-from-suno",
    title: "Refresh from Suno",
    description:
      "Bozuk/kayıp kayıtları Suno record-info ile yenileyip Bunny'e yükler.",
    category: "ops",
    executeCommand: "node --env-file=.env.local scripts/refresh-from-suno.mjs",
    dangerous: true,
  },
  {
    name: "heal-songs",
    title: "Heal songs",
    description:
      "Missing audio_key/image_key olan şarkıları Suno fallback URL'den Bunny'e taşır.",
    category: "ops",
    executeCommand:
      'curl -X POST -H "Authorization: Bearer $ADMIN_HEAL_TOKEN" https://rifmo.com/api/admin/heal-songs',
    dangerous: true,
  },
  {
    name: "fix-durations",
    title: "Fix durations",
    description:
      "duration IS NULL kayıtları için Suno record-info'dan duration çekip yazar.",
    category: "ops",
    executeCommand: "node --env-file=.env.local scripts/fix-durations.mjs",
  },
  {
    name: "cleanup-stale",
    title: "Cleanup stale tasks",
    description:
      "10 dakikadan uzun 'processing' kalan task'ları 'failed' olarak işaretler.",
    category: "maintenance",
    executeCommand: "node --env-file=.env.local scripts/cleanup-stale.mjs",
  },
  {
    name: "health-check",
    title: "Health check",
    description:
      "Her şarkının Bunny CDN URL'ini HEAD ile test eder. 404'leri raporlar.",
    category: "maintenance",
    executeCommand: "node --env-file=.env.local scripts/health-check.mjs",
  },
  {
    name: "check-song",
    title: "Check song",
    description: "Song ID ile detay kontrol. Argüman: şarkı ID(leri).",
    category: "debug",
    executeCommand:
      "node --env-file=.env.local scripts/check-song.mjs <song_id>",
    requiresArg: true,
  },
  {
    name: "check-user",
    title: "Check user",
    description:
      "Username ile user'ın şarkı durumu özeti. Argüman: username (+ --list).",
    category: "debug",
    executeCommand:
      "node --env-file=.env.local scripts/check-user.mjs <username>",
    requiresArg: true,
  },
  {
    name: "test-bunny",
    title: "Bunny smoke test",
    description: "Bunny Storage credentials + upload/download doğrulama.",
    category: "smoke",
    executeCommand: "node --env-file=.env.local scripts/test-bunny.mjs",
  },
];

export function findJob(name: string): JobDefinition | null {
  return JOBS.find((j) => j.name === name) ?? null;
}
