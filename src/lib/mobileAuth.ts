import { NextRequest } from "next/server";
import { auth } from "@/auth";

interface MobileUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  image: string | null;
}

/**
 * Mobil Bearer token'ı doğrula.
 * Token formatı: base64(JSON payload).hmac-sha256-hex
 */
async function verifyMobileToken(token: string): Promise<MobileUser | null> {
  try {
    const [payloadB64, sigHex] = token.split(".");
    if (!payloadB64 || !sigHex) return null;

    const payloadStr = atob(payloadB64);
    const payload = JSON.parse(payloadStr);

    const secret = process.env.AUTH_SECRET || "fallback-secret";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const sigBytes = new Uint8Array(
      sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(payloadStr),
    );

    if (!valid) return null;

    return {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      displayName: payload.displayName,
      image: payload.image,
    };
  } catch {
    return null;
  }
}

/**
 * Hem NextAuth session hem mobil Bearer token destekleyen auth helper.
 * Önce NextAuth session kontrol eder, yoksa Bearer token'a bakar.
 *
 * Kullanım: `const user = await getAuthUser(request);`
 */
export async function getAuthUser(
  request: NextRequest,
): Promise<{ id: string; email?: string; username?: string } | null> {
  // 1. NextAuth session (web)
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? undefined,
      username: (session.user as { username?: string }).username,
    };
  }

  // 2. Bearer token (mobil)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = await verifyMobileToken(token);
    if (user) {
      return {
        id: user.id,
        email: user.email,
        username: user.username,
      };
    }
  }

  return null;
}
