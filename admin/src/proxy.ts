import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin proxy (Next.js 16 convention; eski adı "middleware"). Edge-tarafında
 * IP allowlist kontrolü yapar. Session/role guard her sayfada sunucu tarafında
 * `requireRole()` ile yapılır (Edge runtime'da DB erişimi güvensiz).
 *
 * ADMIN_IP_ALLOWLIST env: boş = herkese açık; doluysa virgülle ayrık IP listesi.
 * CIDR desteği Sprint 1+ için.
 */
export function proxy(req: NextRequest) {
  const allowlist = (process.env.ADMIN_IP_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return NextResponse.next();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";

  if (!ip || !allowlist.some((a) => a === ip || a === `${ip}/32`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
