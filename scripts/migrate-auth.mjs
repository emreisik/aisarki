import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local dosyasından DATABASE_URL oku
const envFile = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envFile, "utf8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    let val = rest.join("=").trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key.trim()] = val;
  }
}

const sql = neon(process.env.DATABASE_URL);

console.log("Migrasyon başlatılıyor...");

// Users tablosu
await sql`
  CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    username    TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url  TEXT,
    bio         TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log("✓ users tablosu oluşturuldu");

// Accounts tablosu (OAuth)
await sql`
  CREATE TABLE IF NOT EXISTS accounts (
    id                TEXT PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider          TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    access_token      TEXT,
    refresh_token     TEXT,
    expires_at        BIGINT,
    UNIQUE(provider, provider_account_id)
  )
`;
console.log("✓ accounts tablosu oluşturuldu");

// Songs tablosuna user_id ekle
await sql`
  ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL
`;
await sql`
  ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE
`;
console.log("✓ songs tablosuna user_id ve is_public eklendi");

// Playlists tablosu
await sql`
  CREATE TABLE IF NOT EXISTS playlists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    cover_url   TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log("✓ playlists tablosu oluşturuldu");

// Playlist songs pivot
await sql`
  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, song_id)
  )
`;
console.log("✓ playlist_songs tablosu oluşturuldu");

// Likes tablosu
await sql`
  CREATE TABLE IF NOT EXISTS likes (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id  TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    liked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, song_id)
  )
`;
console.log("✓ likes tablosu oluşturuldu");

// Follows tablosu
await sql`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
  )
`;
console.log("✓ follows tablosu oluşturuldu");

console.log("\n✅ Tüm tablolar hazır!");
