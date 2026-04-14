import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        s.id, s.title, s.style, s.audio_url, s.stream_url,
        s.image_url, s.duration, s.status, s.created_at,
        u.id           AS creator_id,
        u.display_name AS creator_name,
        u.username     AS creator_username
      FROM songs s
      LEFT JOIN users u ON u.id::text = s.created_by
      WHERE s.status = 'complete'
      ORDER BY s.created_at DESC
      LIMIT 200
    `;

    const songs = rows.map((r) => ({
      id: r.id,
      title: r.title,
      style: r.style ?? undefined,
      audioUrl: r.audio_url ?? undefined,
      streamUrl: r.stream_url ?? undefined,
      imageUrl: r.image_url ?? undefined,
      duration: r.duration != null ? Number(r.duration) : undefined,
      status: r.status,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : r.created_at,
      creator:
        r.creator_id && r.creator_name
          ? {
              id: r.creator_id,
              name: r.creator_name,
              username: r.creator_username,
            }
          : undefined,
    }));

    return NextResponse.json({ songs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[discover-songs]", msg);
    return NextResponse.json({ songs: [], error: msg }, { status: 500 });
  }
}
