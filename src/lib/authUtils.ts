import { signOut } from "next-auth/react";

/**
 * Oturum kapatırken localStorage, IndexedDB ve session verilerini temizler.
 * Tüm signOut çağrıları bu fonksiyon üzerinden yapılmalı.
 */
export function handleSignOut() {
  try {
    localStorage.removeItem("hubeya_player");
    localStorage.removeItem("hubeya_sid");
    sessionStorage.removeItem("hubeya_sid");
  } catch {}

  try {
    indexedDB.deleteDatabase("hubeya");
  } catch {}

  signOut({ callbackUrl: "/" });
}
