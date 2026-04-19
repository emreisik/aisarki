import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

/**
 * Mobil uygulama login endpoint'i.
 * POST /api/auth/mobile-login
 * Body: { email, password }
 * Response: { token, user }
 *
 * Token = base64 JSON (basit, AUTH_SECRET ile HMAC imzalı).
 * Mobil uygulama bu token'ı SecureStore'da saklar,
 * her istekte Authorization: Bearer <token> olarak gönderir.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email ve şifre zorunludur" },
      { status: 400 },
    );
  }

  const rows = await sql`
    SELECT id, email, username, display_name, avatar_url, password_hash
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Email veya şifre hatalı" },
      { status: 401 },
    );
  }

  const user = rows[0];
  if (!user.password_hash) {
    return NextResponse.json(
      { error: "Bu hesap şifre ile giriş yapamaz (Google ile deneyin)" },
      { status: 401 },
    );
  }

  const valid = await bcrypt.compare(password, user.password_hash as string);
  if (!valid) {
    return NextResponse.json(
      { error: "Email veya şifre hatalı" },
      { status: 401 },
    );
  }

  // JWT benzeri token oluştur
  const secret = process.env.AUTH_SECRET || "fallback-secret";
  const payload = {
    id: user.id as string,
    email: user.email as string,
    username: user.username as string,
    displayName: user.display_name as string,
    image: (user.avatar_url as string) || null,
    iat: Date.now(),
  };

  // HMAC-SHA256 imza
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
      image: payload.image,
    },
  });
}
