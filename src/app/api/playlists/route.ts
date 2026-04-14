import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

// Tabloları oluştur / migrate et (idempotent)
async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS playlists (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      cover_url   TEXT,
      is_public   BOOLEAN NOT NULL DEFAULT true,
      type        TEXT NOT NULL DEFAULT 'playlist',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      song_id     TEXT NOT NULL,
      position    INT NOT NULL DEFAULT 0,
      added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (playlist_id, song_id)
    )
  `;
  // Eski tablolara type kolonu ekle
  try {
    await sql`ALTER TABLE playlists ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'playlist'`;
  } catch {
    /* zaten var */
  }
}

export async function GET() {
  await ensureTables();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ playlists: [] });
  }

  const rows = await sql`
    SELECT p.*, COUNT(ps.song_id)::int as song_count
    FROM playlists p
    LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
    WHERE p.user_id = ${session.user.id}
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `;

  const playlists = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description ?? undefined,
    coverUrl: r.cover_url ?? undefined,
    isPublic: r.is_public,
    type: (r.type as "playlist" | "album") ?? "playlist",
    songCount: r.song_count ?? 0,
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt:
      r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  }));

  return NextResponse.json({ playlists });
}

export async function POST(req: NextRequest) {
  await ensureTables();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const { title, description, type } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 });
  }

  const collectionType: "playlist" | "album" =
    type === "album" ? "album" : "playlist";

  const rows = await sql`
    INSERT INTO playlists (user_id, title, description, is_public, type)
    VALUES (${session.user.id}, ${title.trim()}, ${description ?? null}, true, ${collectionType})
    RETURNING *
  `;

  const p = rows[0];
  return NextResponse.json({
    playlist: {
      id: p.id,
      userId: p.user_id,
      title: p.title,
      description: p.description ?? undefined,
      coverUrl: p.cover_url ?? undefined,
      isPublic: p.is_public,
      type: (p.type as "playlist" | "album") ?? "playlist",
      songCount: 0,
      createdAt:
        p.created_at instanceof Date
          ? p.created_at.toISOString()
          : p.created_at,
      updatedAt:
        p.updated_at instanceof Date
          ? p.updated_at.toISOString()
          : p.updated_at,
    },
  });
}
