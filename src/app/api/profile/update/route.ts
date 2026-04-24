import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";
import { updateProfileFields } from "@/lib/taskStore";

/**
 * PATCH /api/profile/update
 * Profil bilgilerini güncelle: display_name, username, bio, bannerUrl, genreTags
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const body = await request.json();
  const { displayName, username, bio, bannerUrl, genreTags } = body as {
    displayName?: string;
    username?: string;
    bio?: string | null;
    bannerUrl?: string | null;
    genreTags?: string[];
  };
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
    const existing = await sql`
      SELECT id FROM users WHERE username = ${username} AND id::text != ${userId} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Bu kullanıcı adı zaten kullanımda" },
        { status: 409 },
      );
    }
  }

  if (bio !== undefined && bio !== null) {
    if (typeof bio !== "string" || bio.length > 500) {
      return NextResponse.json(
        { error: "Bio en fazla 500 karakter olabilir" },
        { status: 400 },
      );
    }
  }

  if (genreTags !== undefined) {
    if (!Array.isArray(genreTags) || genreTags.length > 10) {
      return NextResponse.json(
        { error: "En fazla 10 genre etiketi" },
        { status: 400 },
      );
    }
    for (const t of genreTags) {
      if (typeof t !== "string" || t.length < 1 || t.length > 30) {
        return NextResponse.json(
          { error: "Etiket 1-30 karakter olmalı" },
          { status: 400 },
        );
      }
    }
  }

  // displayName / username güncelleme
  if (displayName !== undefined && username !== undefined) {
    await sql`UPDATE users SET display_name = ${displayName.trim()}, username = ${username} WHERE id::text = ${userId}`;
  } else if (displayName !== undefined) {
    await sql`UPDATE users SET display_name = ${displayName.trim()} WHERE id::text = ${userId}`;
  } else if (username !== undefined) {
    await sql`UPDATE users SET username = ${username} WHERE id::text = ${userId}`;
  }

  // bio / banner / genreTags güncelleme
  if (bio !== undefined || bannerUrl !== undefined || genreTags !== undefined) {
    await updateProfileFields(userId, {
      ...(bio !== undefined ? { bio: bio?.trim() || null } : {}),
      ...(bannerUrl !== undefined ? { bannerUrl } : {}),
      ...(genreTags !== undefined
        ? {
            genreTags: genreTags.map((t) => t.trim().toLowerCase()),
          }
        : {}),
    });
  }

  return NextResponse.json({ ok: true });
}
