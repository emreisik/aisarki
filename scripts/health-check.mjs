#!/usr/bin/env node
/**
 * Kapsamlı şarkı URL sağlık kontrolü.
 * Her şarkının Bunny CDN URL'ini HEAD ile test eder.
 * - 200 → sağlıklı
 * - 404 → Bunny'de yok (key set ama dosya kayıp)
 * - Diğer → problem
 *
 * Ayrıca duration, image_key, lyrics/prompt kontrolü yapar.
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
const CDN_URL = (process.env.BUNNY_CDN_URL ?? "").replace(/\/$/, "");
const PREFIX = "aisarki";

if (!DATABASE_URL || !CDN_URL) {
  console.error("Eksik env: DATABASE_URL, BUNNY_CDN_URL");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function headCheck(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    const length = res.headers.get("content-length");
    const type = res.headers.get("content-type");
    return {
      ok: res.ok,
      status: res.status,
      size: length ? parseInt(length, 10) : 0,
      type,
    };
  } catch (e) {
    return { ok: false, status: 0, reason: e.message };
  }
}

console.log("══ ŞARKI URL SAĞLIK KONTROLÜ ══\n");

const rows = await sql`
  SELECT id, title, status, audio_key, image_key, audio_url, duration
  FROM songs
  ORDER BY created_at DESC
`;

console.log(`Toplam kayıt: ${rows.length}\n`);

const broken = [];
const missingAudio = [];
const missingImage = [];
const noDuration = [];
let audioOk = 0;
let imageOk = 0;

for (const [i, r] of rows.entries()) {
  const progress = `[${i + 1}/${rows.length}]`;

  // Audio kontrolü
  const audioKey = r.audio_key;
  if (!audioKey) {
    broken.push({ id: r.id, title: r.title, reason: "audio_key yok" });
    process.stdout.write(`\r${progress} ✗ ${r.id.slice(0, 8)} audio_key yok    `);
    continue;
  }
  const audioUrl = `${CDN_URL}/${PREFIX}/${audioKey}`;
  const audioCheck = await headCheck(audioUrl);
  if (audioCheck.ok && audioCheck.size > 10000) {
    audioOk++;
    process.stdout.write(
      `\r${progress} ✓ ${r.id.slice(0, 8)} ${(audioCheck.size / 1024 / 1024).toFixed(2)}MB    `,
    );
  } else {
    missingAudio.push({
      id: r.id,
      title: r.title,
      status: audioCheck.status,
      url: audioUrl,
    });
    process.stdout.write(
      `\r${progress} ✗ ${r.id.slice(0, 8)} ${audioCheck.status}    `,
    );
  }

  // Image kontrolü
  if (r.image_key) {
    const imageUrl = `${CDN_URL}/${PREFIX}/${r.image_key}`;
    const imgCheck = await headCheck(imageUrl);
    if (imgCheck.ok && imgCheck.size > 1000) {
      imageOk++;
    } else {
      missingImage.push({ id: r.id, title: r.title, status: imgCheck.status });
    }
  }

  // Duration
  if (r.duration == null) {
    noDuration.push({ id: r.id, title: r.title });
  }
}

console.log("\n\n── ÖZET ──");
console.log(`✓ Audio erişilebilir   : ${audioOk}/${rows.length}`);
console.log(`✓ Image erişilebilir   : ${imageOk}`);
console.log(`✗ Audio_key null       : ${broken.length}`);
console.log(`✗ Bunny'de yok (404)   : ${missingAudio.length}`);
console.log(`✗ Image kırık          : ${missingImage.length}`);
console.log(`✗ Duration null        : ${noDuration.length}`);

if (broken.length > 0) {
  console.log("\n── AUDIO_KEY NULL ──");
  for (const b of broken.slice(0, 10))
    console.log(`  ${b.id} | ${b.title?.slice(0, 50)}`);
  if (broken.length > 10) console.log(`  ... +${broken.length - 10} daha`);
}

if (missingAudio.length > 0) {
  console.log("\n── BUNNY'DE BULUNAMADI ──");
  for (const m of missingAudio.slice(0, 10))
    console.log(`  ${m.id} | ${m.title?.slice(0, 40)} | ${m.status}`);
  if (missingAudio.length > 10)
    console.log(`  ... +${missingAudio.length - 10} daha`);
}

if (missingImage.length > 0) {
  console.log("\n── IMAGE KIRIK ──");
  for (const m of missingImage.slice(0, 5))
    console.log(`  ${m.id} | ${m.title?.slice(0, 40)} | ${m.status}`);
  if (missingImage.length > 5)
    console.log(`  ... +${missingImage.length - 5} daha`);
}

if (noDuration.length > 0) {
  console.log("\n── DURATION NULL ──");
  for (const m of noDuration.slice(0, 5))
    console.log(`  ${m.id} | ${m.title?.slice(0, 40)}`);
  if (noDuration.length > 5)
    console.log(`  ... +${noDuration.length - 5} daha`);
}

console.log("");
