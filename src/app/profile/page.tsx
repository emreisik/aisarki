import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * /profile — Kendi profil sayfası.
 * Başkalarıyla birebir aynı tasarımı kullanabilmek için session'daki username'e
 * redirect ediyoruz; /profile/[username] zaten `isOwnProfile` kontrolüyle
 * "Düzenle" butonunu kendi profilinde gösteriyor.
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/profile");
  }
  const username = (session.user as { username?: string }).username;
  if (!username) {
    // Session var ama username yok (edge case) — ana sayfaya düş
    redirect("/");
  }
  redirect(`/profile/${username}`);
}
