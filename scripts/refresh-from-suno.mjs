#!/usr/bin/env node
/**
 * audio_url'i boş olan / audio_key'i null olan şarkıları Suno record-info
 * API'sinden yenileyip Bunny'e uploadeder.
 *
 * Usage: node --env-file=.env.local scripts/refresh-from-suno.mjs
 */

import { neon } from "@neondatabase/serverless";

const {
  DATABASE_URL,
  SUNO_API_KEY,
  BUNNY_STORAGE_ZONE: ZONE,
  BUNNY_STORAGE_PASSWORD: PASSWORD,
  BUNNY_STORAGE_HOST: HOST = "storage.bunnycdn.com",
  BUNNY_CDN_URL,
} = process.env;

if (!DATABASE_URL || !SUNO_API_KEY || !ZONE || !PASSWORD || !BUNNY_CDN_URL) {
  console.error("Eksik env: DATABASE_URL, SUNO_API_KEY, BUNNY_*");
  process.exit(1);
}

const SUNO_BASE = "https://api.sunoapi.org";
const PREFIX = "aisarki";
const sql = neon(DATABASE_URL);

async function fetchRecordInfo(taskId) {
  const res = await fetch(
    `${SUNO_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
    { headers: { Authorization: `Bearer ${SUNO_API_KEY}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const songs = data?.data?.response?.sunoData ?? [];
  return songs;
}

async function uploadToBunny(sourceUrl, path, ct = "audio/mpeg") {
  if (!sourceUrl?.startsWith("http")) return { ok: false };
  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status };
    const buffer = await res.arrayBuffer();
    const putRes = await fetch(`https://${HOST}/${ZONE}/${PREFIX}/${path}`, {
      method: "PUT",
      headers: { AccessKey: PASSWORD, "Content-Type": ct },
      body: buffer,
    });
    if (!putRes.ok) return { ok: false, status: putRes.status };
    return { ok: true, size: buffer.byteLength };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function run() {
  const rows = await sql`
    SELECT id, task_id, audio_url, stream_url
    FROM songs
    WHERE audio_key IS NULL
      AND (audio_url IS NULL OR audio_url = '')
      AND task_id IS NOT NULL
    ORDER BY created_at DESC
  `;

  console.log(`Yenilenecek: ${rows.length}`);
  if (rows.length === 0) return;

  // task_id → şarkı map (aynı task'tan birden fazla şarkı gelebilir)
  const byTask = new Map();
  for (const r of rows) {
    if (!byTask.has(r.task_id)) byTask.set(r.task_id, []);
    byTask.get(r.task_id).push(r);
  }

  let ok = 0;
  let failed = 0;

  for (const [taskId, songs] of byTask) {
    console.log(`\n[task ${taskId}] ${songs.length} şarkı`);
    const sunoSongs = await fetchRecordInfo(taskId);
    if (!sunoSongs || sunoSongs.length === 0) {
      console.log(`  ⊘ Suno record-info boş döndü`);
      failed += songs.length;
      continue;
    }

    for (const song of songs) {
      const suno = sunoSongs.find((s) => s.id === song.id);
      if (!suno) {
        console.log(`  ✗ ${song.id} Suno'da bulunamadı`);
        failed++;
        continue;
      }
      const audioUrl =
        suno.source_audio_url ||
        suno.audio_url ||
        suno.audioUrl ||
        suno.streamAudioUrl;
      if (!audioUrl) {
        console.log(`  ✗ ${song.id} audio URL yok`);
        failed++;
        continue;
      }
      const key = `songs/${song.id}.mp3`;
      const up = await uploadToBunny(audioUrl, key);
      if (up.ok) {
        const duration = typeof suno.duration === "number" ? suno.duration : null;
        if (duration) {
          await sql`UPDATE songs SET audio_key = ${key}, duration = ${duration} WHERE id = ${song.id}`;
        } else {
          await sql`UPDATE songs SET audio_key = ${key} WHERE id = ${song.id}`;
        }
        const mb = (up.size / 1024 / 1024).toFixed(2);
        console.log(`  ✓ ${song.id} ${mb}MB${duration ? ` (${duration}s)` : ""}`);
        ok++;
      } else {
        console.log(`  ✗ ${song.id} upload failed (${up.status || up.reason})`);
        failed++;
      }

      // image de yenile
      const imageUrl = suno.source_image_url || suno.image_url || suno.imageUrl;
      if (imageUrl) {
        const imgKey = `covers/${song.id}.jpg`;
        const up2 = await uploadToBunny(imageUrl, imgKey, "image/jpeg");
        if (up2.ok) {
          await sql`UPDATE songs SET image_key = ${imgKey} WHERE id = ${song.id}`;
        }
      }
    }
  }

  console.log(`\n── Özet ──\n✓ ${ok}\n✗ ${failed}`);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
