#!/usr/bin/env node
/**
 * Kapsamlı DB denetimi:
 * - Kaç şarkı var, kaçı Bunny'de, kaçı hala sadece Suno
 * - Kırık kayıtlar (audio_key ve audio_url ikisi de yok)
 * - Image durumu
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const stats = await sql`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE audio_key IS NOT NULL) AS has_audio_key,
    COUNT(*) FILTER (WHERE audio_key IS NULL AND audio_url IS NOT NULL AND audio_url != '') AS suno_only,
    COUNT(*) FILTER (WHERE audio_key IS NULL AND (audio_url IS NULL OR audio_url = '')) AS broken,
    COUNT(*) FILTER (WHERE image_key IS NOT NULL) AS has_image_key,
    COUNT(*) FILTER (WHERE image_key IS NULL AND image_url IS NOT NULL AND image_url != '') AS image_suno_only,
    COUNT(*) FILTER (WHERE status = 'complete') AS complete
  FROM songs
`;
const s = stats[0];

console.log("══ ŞARKI DURUMU ══");
console.log(`Toplam kayıt       : ${s.total}`);
console.log(`Status complete    : ${s.complete}`);
console.log("");
console.log("── AUDIO ──");
console.log(`✓ Bunny'de         : ${s.has_audio_key}`);
console.log(`⚠ Sadece Suno URL  : ${s.suno_only}  (15 gün sonra ölecek!)`);
console.log(`✗ Kırık (audio yok): ${s.broken}`);
console.log("");
console.log("── IMAGE ──");
console.log(`✓ Bunny'de         : ${s.has_image_key}`);
console.log(`⚠ Sadece Suno URL  : ${s.image_suno_only}`);

// Detay: Suno-only audio olanlar
if (Number(s.suno_only) > 0) {
  console.log("\n── Hala Suno'da kalan şarkılar ──");
  const rows = await sql`
    SELECT id, title, audio_url, created_at
    FROM songs
    WHERE audio_key IS NULL AND audio_url IS NOT NULL AND audio_url != ''
    ORDER BY created_at DESC
    LIMIT 10
  `;
  for (const r of rows) {
    console.log(`  ${r.id} | ${r.title?.slice(0, 40)} | ${r.audio_url.slice(0, 60)}...`);
  }
}

// Detay: kırık olanlar
if (Number(s.broken) > 0) {
  console.log("\n── Kırık şarkılar (audio hiç yok) ──");
  const rows = await sql`
    SELECT id, title, status, task_id, created_at
    FROM songs
    WHERE audio_key IS NULL AND (audio_url IS NULL OR audio_url = '')
    ORDER BY created_at DESC
    LIMIT 10
  `;
  for (const r of rows) {
    console.log(`  ${r.id} | ${r.title?.slice(0, 40)} | task=${r.task_id?.slice(0, 12) || "(null)"} | ${r.status}`);
  }
}
