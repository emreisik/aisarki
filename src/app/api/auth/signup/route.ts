import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      username      TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL,
      avatar_url    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  await ensureUsersTable();
  const { email, password, username, displayName } = await req.json();

  if (!email || !password || !username) {
    return NextResponse.json(
      { error: "Email, şifre ve kullanıcı adı zorunludur" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Şifre en az 6 karakter olmalıdır" },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Kullanıcı adı 3-20 karakter, sadece harf/rakam/alt çizgi" },
      { status: 400 },
    );
  }

  // Tekrar kontrol
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

  await sql`
    INSERT INTO users (email, password_hash, username, display_name)
    VALUES (${email}, ${hash}, ${username}, ${displayName || username})
  `;

  return NextResponse.json({ ok: true });
}
