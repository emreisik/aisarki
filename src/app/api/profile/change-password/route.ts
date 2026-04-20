import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/profile/change-password
 * Şifre değiştir: mevcut şifre + yeni şifre
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Mevcut şifre ve yeni şifre zorunludur" },
      { status: 400 },
    );
  }

  if (typeof newPassword !== "string" || newPassword.length < 10) {
    return NextResponse.json(
      { error: "Yeni şifre en az 10 karakter olmalıdır" },
      { status: 400 },
    );
  }

  const rows = await sql`
    SELECT password_hash FROM users WHERE id = ${session.user.id} LIMIT 1
  `;

  if (rows.length === 0 || !rows[0].password_hash) {
    return NextResponse.json(
      { error: "Bu hesap şifre ile giriş yapmıyor" },
      { status: 400 },
    );
  }

  const valid = await bcrypt.compare(
    currentPassword,
    rows[0].password_hash as string,
  );
  if (!valid) {
    return NextResponse.json({ error: "Mevcut şifre yanlış" }, { status: 401 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${session.user.id}`;

  return NextResponse.json({ ok: true });
}
