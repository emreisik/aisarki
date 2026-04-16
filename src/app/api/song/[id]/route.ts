import { NextRequest, NextResponse } from "next/server";
import { getSongById } from "@/lib/taskStore";
import { auth } from "@/auth";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const song = await getSongById(id);
  if (!song) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ song });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { duration?: number } = {};
  try {
    body = (await req.json()) as { duration?: number };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const d = Number(body.duration);
  if (!Number.isFinite(d) || d <= 0 || d > 1800) {
    return NextResponse.json({ error: "Geçersiz duration" }, { status: 400 });
  }

  // Sadece NULL olan duration'ı yaz (ilk kez öğrenilen) — overwrite yok
  await sql`
    UPDATE songs SET duration = ${d}
    WHERE id = ${id} AND duration IS NULL
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

  // Sadece şarkının sahibi silebilir
  const rows = await sql`
    SELECT created_by FROM songs WHERE id = ${id} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Şarkı bulunamadı" }, { status: 404 });
  }
  if (rows[0].created_by !== session.user.id) {
    return NextResponse.json({ error: "Yetkin yok" }, { status: 403 });
  }

  await sql`DELETE FROM songs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
