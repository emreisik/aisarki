import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

/**
 * Mobil uygulama kayıt endpoint'i.
 * POST /api/auth/mobile-signup
 * Body: { email, password, username, displayName }
 * Response: { token, user }
 *
 * Kayıt başarılı olursa otomatik login token'ı da döner.
 */
export async function POST(req: NextRequest) {
  const { email, password, username, displayName } = await req.json();

  if (!email || !password || !username) {
    return NextResponse.json(
      { error: "Email, şifre ve kullanıcı adı zorunludur" },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length < 10) {
    return NextResponse.json(
      { error: "Şifre en az 10 karakter olmalıdır" },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Kullanıcı adı 3-20 karakter, sadece harf/rakam/alt çizgi" },
      { status: 400 },
    );
  }

  const existing = await sql`
    SELECT id FROM users WHERE email = ${email} OR username = ${username} LIMIT 1
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Bu email veya kullanıcı adı zaten kullanımda" },
      { status: 409 },
    );
  }

  const hash = await bcrypt.hash(password, 12);

  const inserted = await sql`
    INSERT INTO users (email, password_hash, username, display_name)
    VALUES (${email}, ${hash}, ${username}, ${displayName || username})
    RETURNING id, email, username, display_name, avatar_url
  `;

  const user = inserted[0];

  // Otomatik login token oluştur
  const secret = process.env.AUTH_SECRET || "fallback-secret";
  const payload = {
    id: user.id as string,
    email: user.email as string,
    username: user.username as string,
    displayName: user.display_name as string,
    image: null,
    iat: Date.now(),
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payloadStr = JSON.stringify(payload);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadStr),
  );
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const token = btoa(payloadStr) + "." + sigHex;

  return NextResponse.json({
    token,
    user: {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      displayName: payload.displayName,
      image: null,
    },
  });
}
