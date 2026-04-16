import crypto from "node:crypto";
import { NextRequest } from "next/server";

/** Timing-safe string eşitlik — aynı uzunlukta Buffer karşılaştırması.
 *  Farklı uzunluktaysa önce pad et (timing-safe compare same-length buffer gerektirir). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // length de leak olmasın diye fixed-length compare
    const max = Math.max(ab.length, bb.length, 32);
    const ap = Buffer.concat([ab, Buffer.alloc(max - ab.length)]);
    const bp = Buffer.concat([bb, Buffer.alloc(max - bb.length)]);
    crypto.timingSafeEqual(ap, bp);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/** Admin endpoint auth. Env'e `ADMIN_HEAL_TOKEN` bak, Authorization header'dan bearer al.
 *  Query param kullanma — browser history/log leak. */
export function checkAdminToken(req: NextRequest): {
  ok: boolean;
  error?: string;
  status?: number;
} {
  const expected = process.env.ADMIN_HEAL_TOKEN ?? "";
  if (!expected) {
    return { ok: false, error: "ADMIN_HEAL_TOKEN not configured", status: 500 };
  }
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const candidate = bearer || xAdmin;
  if (!candidate) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }
  if (!timingSafeEqual(candidate, expected)) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }
  return { ok: true };
}
