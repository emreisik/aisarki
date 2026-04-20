import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

/**
 * PATCH /api/profile/update
 * Profil bilgilerini güncelle: display_name, username
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { displayName, username } = await request.json();
  const userId = session.user.id;

  // Validasyon
  if (displayName !== undefined) {
    if (
      typeof displayName !== "string" ||
      displayName.trim().length < 1 ||
      displayName.length > 80
    ) {
      return NextResponse.json(
        { error: "Görünen ad 1-80 karakter olmalı" },
        { status: 400 },
      );
    }
  }

  if (username !== undefined) {
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı adı 3-20 karakter, sadece küçük harf/rakam/alt çizgi",
        },
        { status: 400 },
      );
    }
    // Benzersizlik kontrolü
    const existing = await sql`
      SELECT id FROM users WHERE username = ${username} AND id != ${userId} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Bu kullanıcı adı zaten kullanımda" },
        { status: 409 },
      );
    }
  }

  // Güncelle
  if (displayName !== undefined && username !== undefined) {
    await sql`UPDATE users SET display_name = ${displayName.trim()}, username = ${username} WHERE id = ${userId}`;
  } else if (displayName !== undefined) {
    await sql`UPDATE users SET display_name = ${displayName.trim()} WHERE id = ${userId}`;
  } else if (username !== undefined) {
    await sql`UPDATE users SET username = ${username} WHERE id = ${userId}`;
  }

  return NextResponse.json({ ok: true });
}
