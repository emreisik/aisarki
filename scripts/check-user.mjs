#!/usr/bin/env node
/**
 * Bir kullanıcının şarkı durumunu özetle.
 * Kullanım:
 *   node --env-file=.env.local scripts/check-user.mjs kenan
 *   node --env-file=.env.local scripts/check-user.mjs kenan --list
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL eksik (ör: node --env-file=.env.local ...)");
  process.exit(1);
}

const args = process.argv.slice(2);
const username = args[0];
const showList = args.includes("--list");

if (!username) {
  console.error("Usage: node --env-file=.env.local scripts/check-user.mjs <username> [--list]");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const userRows = await sql`
  SELECT id, username, display_name, email, created_at
  FROM users
  WHERE username = ${username}
  LIMIT 1
`;

if (userRows.length === 0) {
  console.error(`❌ Kullanıcı bulunamadı: @${username}`);
  process.exit(1);
}

const user = userRows[0];
console.log(`\n👤 ${user.display_name} (@${user.username})`);
console.log(`   id:      ${user.id}`);
console.log(`   email:   ${user.email}`);
console.log(`   created: ${user.created_at}`);

const stats = await sql`
  SELECT
    COUNT(*)::int                                                AS total,
    COUNT(*) FILTER (WHERE status = 'complete')::int             AS complete,
    COUNT(*) FILTER (WHERE status = 'processing')::int           AS processing,
    COUNT(*) FILTER (WHERE status = 'failed')::int               AS failed,
    COUNT(*) FILTER (WHERE audio_key IS NOT NULL)::int           AS with_audio_key,
    COUNT(*) FILTER (WHERE stream_url IS NOT NULL)::int          AS with_stream_url,
    COUNT(*) FILTER (WHERE audio_url IS NOT NULL)::int           AS with_audio_url,
    COUNT(*) FILTER (
      WHERE audio_key IS NOT NULL
         OR stream_url IS NOT NULL
         OR audio_url IS NOT NULL
    )::int                                                       AS playable_any,
    COUNT(*) FILTER (
      WHERE status = 'complete' AND audio_key IS NOT NULL
    )::int                                                       AS old_strict_filter
  FROM songs
  WHERE created_by = ${String(user.id)}
`;

const s = stats[0];
console.log(`\n📊 Şarkı özeti:`);
console.log(`   Toplam            : ${s.total}`);
console.log(`   Status=complete   : ${s.complete}`);
console.log(`   Status=processing : ${s.processing}`);
console.log(`   Status=failed     : ${s.failed}`);
console.log(`   ---`);
console.log(`   audio_key var     : ${s.with_audio_key}`);
console.log(`   stream_url var    : ${s.with_stream_url}`);
console.log(`   audio_url var     : ${s.with_audio_url}`);
console.log(`   ---`);
console.log(`   ✅ Yeni filtre (çalınabilir herhangi biri): ${s.playable_any}`);
console.log(`   ⚠️  Eski filtre (complete + audio_key)    : ${s.old_strict_filter}`);

const diff = s.playable_any - s.old_strict_filter;
if (diff > 0) {
  console.log(`\n🆕 Eski filtrede gizlenen ama artık görünen: ${diff} şarkı`);
} else if (s.playable_any === 0) {
  console.log(`\n❌ Bu kullanıcının hiç çalınabilir şarkısı yok.`);
} else {
  console.log(`\n✅ Tüm çalınabilir şarkılar zaten eski filtrede de görünüyordu.`);
}

if (showList) {
  const songs = await sql`
    SELECT id, title, status,
           audio_key  IS NOT NULL AS has_key,
           stream_url IS NOT NULL AS has_stream,
           audio_url  IS NOT NULL AS has_url,
           created_at
    FROM songs
    WHERE created_by = ${String(user.id)}
    ORDER BY created_at DESC
  `;
  console.log(`\n📜 Şarkılar (${songs.length}):`);
  for (const song of songs) {
    const flags = [
      song.has_key ? "K" : "-",
      song.has_stream ? "S" : "-",
      song.has_url ? "U" : "-",
    ].join("");
    const date = new Date(song.created_at).toISOString().slice(0, 10);
    console.log(
      `  [${flags}] ${date} ${song.status.padEnd(10)} ${song.id.slice(0, 8)}  ${song.title ?? "(başlıksız)"}`,
    );
  }
  console.log(`\n  Bayraklar: K=audio_key  S=stream_url  U=audio_url`);
}
