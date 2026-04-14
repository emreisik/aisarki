import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = await sql`
    SELECT p.*, u.username, u.display_name
    FROM playlists p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ${id}
    LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const songRows = await sql`
    SELECT s.*, ps.position, ps.added_at
    FROM playlist_songs ps
    JOIN songs s ON s.id = ps.song_id
    WHERE ps.playlist_id = ${id}
    ORDER BY ps.position ASC, ps.added_at ASC
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
      owner: { username: p.username, displayName: p.display_name },
      songCount: songRows.length,
      songs: songRows.map((s) => ({
        id: s.id,
        title: s.title,
        style: s.style ?? undefined,
        prompt: s.prompt ?? undefined,
        audioUrl: s.audio_url ?? undefined,
        streamUrl: s.stream_url ?? undefined,
        imageUrl: s.image_url ?? undefined,
        duration: s.duration != null ? Number(s.duration) : undefined,
        status: s.status,
        createdAt:
          s.created_at instanceof Date
            ? s.created_at.toISOString()
            : s.created_at,
      })),
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const { id } = await params;
  const { title, description } = await req.json();

  await sql`
    UPDATE playlists
    SET title = ${title}, description = ${description ?? null}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const { id } = await params;
  await sql`DELETE FROM playlists WHERE id = ${id} AND user_id = ${session.user.id}`;

  return NextResponse.json({ ok: true });
}
