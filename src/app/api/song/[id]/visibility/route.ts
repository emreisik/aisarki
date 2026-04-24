import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

/**
 * Şarkının görünürlüğünü (is_public) değiştir.
 * Sadece şarkının sahibi çağırabilir.
 *
 * PATCH /api/song/[id]/visibility  body: { isPublic: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { id } = await params;
  const { isPublic } = (await request.json()) as { isPublic?: boolean };

  if (typeof isPublic !== "boolean") {
    return NextResponse.json(
      { error: "isPublic alanı boolean olmalı" },
      { status: 400 },
    );
  }

  const rows = await sql`
    UPDATE songs
    SET is_public = ${isPublic}
    WHERE id = ${id} AND created_by = ${session.user.id}
    RETURNING id, is_public
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Şarkı bulunamadı veya sahibi değilsin" },
      { status: 404 },
    );
  }

  return NextResponse.json({ id: rows[0].id, isPublic: rows[0].is_public });
}
