import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const { id } = await params;
  const { songId } = await req.json();

  // Playlist sahibi mi?
  const pl =
    await sql`SELECT id FROM playlists WHERE id = ${id} AND user_id = ${session.user.id} LIMIT 1`;
  if (pl.length === 0) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  // En yüksek pozisyonu bul
  const pos = await sql`
    SELECT COALESCE(MAX(position), -1) + 1 as next_pos
    FROM playlist_songs WHERE playlist_id = ${id}
  `;
  const nextPos = pos[0].next_pos as number;

  await sql`
    INSERT INTO playlist_songs (playlist_id, song_id, position)
    VALUES (${id}, ${songId}, ${nextPos})
    ON CONFLICT (playlist_id, song_id) DO NOTHING
  `;

  await sql`UPDATE playlists SET updated_at = NOW() WHERE id = ${id}`;

  // Cover güncelle (ilk şarkının görseli)
  await sql`
    UPDATE playlists SET cover_url = (
      SELECT s.image_url FROM playlist_songs ps
      JOIN songs s ON s.id = ps.song_id
      WHERE ps.playlist_id = ${id} AND s.image_url IS NOT NULL
      ORDER BY ps.position ASC LIMIT 1
    ) WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const { id } = await params;
  const { songId } = await req.json();

  const pl =
    await sql`SELECT id FROM playlists WHERE id = ${id} AND user_id = ${session.user.id} LIMIT 1`;
  if (pl.length === 0) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  await sql`DELETE FROM playlist_songs WHERE playlist_id = ${id} AND song_id = ${songId}`;
  await sql`UPDATE playlists SET updated_at = NOW() WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
