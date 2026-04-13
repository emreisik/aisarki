import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

export async function GET() {
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
    songCount: r.song_count ?? 0,
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt:
      r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  }));

  return NextResponse.json({ playlists });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const { title, description } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO playlists (user_id, title, description, is_public)
    VALUES (${session.user.id}, ${title.trim()}, ${description ?? null}, true)
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
