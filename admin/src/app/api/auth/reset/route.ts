import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/auth/reset
 *
 * AUTH_SECRET değiştiğinde veya eski şifrelenmiş bir session cookie
 * decrypt edilemediğinde (JWTSessionError) kullanıcı bu endpoint'e yönlenerek
 * tüm Auth.js cookie'lerini temizleyip /login sayfasına döner.
 */
const AUTH_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

function clearAuthCookies(res: NextResponse) {
  for (const name of AUTH_COOKIES) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?reset=1", req.url));
  clearAuthCookies(res);
  return res;
}
