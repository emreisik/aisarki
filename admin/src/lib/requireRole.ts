import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { hasAtLeast, type AdminRole } from "@/lib/roles";

/**
 * Server component / server action guard.
 * Oturum yok → /login; rol yetersiz → /login?error=forbidden
 * Başarılıysa session dönülür (user.id, user.role vb.).
 *
 * AUTH_SECRET değişimi sonrası bozuk cookie decrypt hatalarını yutar
 * ve kullanıcıyı /login'e yönlendirir (cookie /api/auth/reset ile temizlenebilir).
 */
export async function requireRole(
  min: AdminRole = "support",
): Promise<Session> {
  let session: Session | null = null;
  try {
    session = (await auth()) as Session | null;
  } catch {
    redirect("/login");
  }
  if (!session?.user?.role) {
    redirect("/login");
  }
  if (!hasAtLeast(session.user.role, min)) {
    redirect("/login?error=forbidden");
  }
  return session;
}
