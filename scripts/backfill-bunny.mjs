#!/usr/bin/env node
/**
 * Eski şarkıları Bunny Storage'a taşır.
 *
 * DB'deki audio_key IS NULL kayıtlarını bulur, audio_url (Suno) üzerinden
 * indirip Bunny'e yükler ve audio_key set eder. Image için de aynı.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-bunny.mjs
 *   node --env-file=.env.local scripts/backfill-bunny.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-bunny.mjs --limit=50
 */

import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : null;

const DATABASE_URL = process.env.DATABASE_URL;
const ZONE = process.env.BUNNY_STORAGE_ZONE;
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const HOST = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const CDN_URL = (process.env.BUNNY_CDN_URL ?? "").replace(/\/$/, "");
const PREFIX = "aisarki";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL env eksik");
  process.exit(1);
}
if (!ZONE || !PASSWORD || !CDN_URL) {
  console.error("❌ BUNNY_* env'leri eksik");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function uploadToBunny(sourceUrl, path, fallbackContentType) {
  if (!sourceUrl || typeof sourceUrl !== "string" || !sourceUrl.startsWith("http")) {
    return { ok: false, status: 0, reason: "invalid-url" };
  }
  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const contentType = res.headers.get("content-type") ?? fallbackContentType;
    const buffer = await res.arrayBuffer();
    const putRes = await fetch(`https://${HOST}/${ZONE}/${PREFIX}/${path}`, {
      method: "PUT",
      headers: { AccessKey: PASSWORD, "Content-Type": contentType },
      body: buffer,
    });
    if (!putRes.ok) {
      return { ok: false, status: putRes.status };
    }
    return { ok: true, size: buffer.byteLength };
  } catch (e) {
    return { ok: false, status: 0, reason: e.message };
  }
}

async function run() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  // audio_key boş olanları bul (en yeniler önce — 15 gün limitine daha yakınlar)
  const rows = LIMIT
    ? await sql`
        SELECT id, audio_url, image_url, audio_key, image_key
        FROM songs
        WHERE audio_key IS NULL AND audio_url IS NOT NULL AND audio_url != ''
        ORDER BY created_at DESC
        LIMIT ${LIMIT}
      `
    : await sql`
        SELECT id, audio_url, image_url, audio_key, image_key
        FROM songs
        WHERE audio_key IS NULL AND audio_url IS NOT NULL AND audio_url != ''
        ORDER BY created_at DESC
      `;

  console.log(`Bulunan kayıt: ${rows.length}`);
  if (rows.length === 0) return;

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const [i, row] of rows.entries()) {
    const progress = `[${i + 1}/${rows.length}]`;
    if (DRY_RUN) {
      console.log(`${progress} ${row.id} — audio: ${row.audio_url?.slice(0, 60)}…`);
      continue;
    }

    // Audio upload
    const audioKey = `songs/${row.id}.mp3`;
    const audioRes = await uploadToBunny(row.audio_url, audioKey, "audio/mpeg");
    if (audioRes.ok) {
      await sql`UPDATE songs SET audio_key = ${audioKey} WHERE id = ${row.id}`;
      const mb = (audioRes.size / 1024 / 1024).toFixed(2);
      console.log(`${progress} ✓ ${row.id} audio ${mb}MB`);
      ok++;
    } else {
      console.log(
        `${progress} ✗ ${row.id} audio failed (${audioRes.status}) — Suno URL muhtemelen öldü`,
      );
      if (audioRes.status === 403 || audioRes.status === 404) {
        skipped++;
      } else {
        failed++;
      }
      continue; // audio başarısızsa image denemeye gerek yok
    }

    // Image upload (opsiyonel, hata vermeyelim)
    if (row.image_url && !row.image_key) {
      const imageKey = `covers/${row.id}.jpg`;
      const imgRes = await uploadToBunny(row.image_url, imageKey, "image/jpeg");
      if (imgRes.ok) {
        await sql`UPDATE songs SET image_key = ${imageKey} WHERE id = ${row.id}`;
      }
    }
  }

  console.log(`\n── Özet ──`);
  console.log(`✓ Başarılı: ${ok}`);
  console.log(`✗ Hatalı:   ${failed}`);
  console.log(`⊘ Atlandı:  ${skipped} (Suno URL ölmüş)`);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
