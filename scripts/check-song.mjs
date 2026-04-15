#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL eksik");
  process.exit(1);
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Usage: node scripts/check-song.mjs <id1> <id2> ...");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

for (const id of ids) {
  const rows =
    await sql`SELECT id, title, status, audio_url IS NULL OR audio_url = '' AS audio_empty, audio_key, stream_url IS NOT NULL AS has_stream, created_at FROM songs WHERE id = ${id}`;
  if (rows.length === 0) {
    console.log(`❌ ${id} — DB'de yok`);
    continue;
  }
  const r = rows[0];
  console.log(`${id}:`);
  console.log(`  title     : ${r.title}`);
  console.log(`  status    : ${r.status}`);
  console.log(`  audio_empty: ${r.audio_empty}`);
  console.log(`  audio_key : ${r.audio_key || "(null)"}`);
  console.log(`  has_stream: ${r.has_stream}`);
  console.log(`  created   : ${r.created_at}`);
}
