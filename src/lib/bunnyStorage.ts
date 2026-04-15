/**
 * Bunny Storage entegrasyonu — Suno'dan gelen geçici audio/image URL'lerini
 * kendi CDN'imize indirip kalıcılık sağlar.
 *
 * DB'de tam URL yerine **key** saklanır (örn "songs/xxx.mp3").
 * Client'a gönderilirken CDN base URL ile birleştirilir.
 * Böylece CDN domain değişirse sadece env güncellenir, DB migration yok.
 *
 * Env:
 *   BUNNY_STORAGE_ZONE     — zone adı (örn: qrhubmenu)
 *   BUNNY_STORAGE_PASSWORD — storage zone password/API key
 *   BUNNY_STORAGE_HOST     — storage host (örn: storage.bunnycdn.com)
 *   BUNNY_CDN_URL          — public CDN URL (örn: https://qrhubmenu.b-cdn.net)
 */

const ZONE = process.env.BUNNY_STORAGE_ZONE ?? "";
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD ?? "";
const HOST = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const CDN_URL = (process.env.BUNNY_CDN_URL ?? "").replace(/\/$/, "");
// Storage zone içindeki tüm dosyalar bu prefix altında durur
const PREFIX = "aisarki";

export function isBunnyConfigured(): boolean {
  return !!(ZONE && PASSWORD && CDN_URL);
}

/**
 * Key → tam CDN URL. DB'de tutulan key'i client'a gönderirken kullan.
 * Örn: "songs/xxx.mp3" → "https://qrhubmenu.b-cdn.net/aisarki/songs/xxx.mp3"
 */
export function keyToCdnUrl(key: string): string | null {
  if (!CDN_URL || !key) return null;
  return `${CDN_URL}/${PREFIX}/${key}`;
}

/**
 * Verilen URL'i indirip Bunny Storage'a yükler ve KEY döner.
 * Key örn: "songs/xxx.mp3" (storage içindeki path, CDN URL'i hariç).
 * Hata durumunda null döner.
 */
export async function uploadAudioFromUrl(
  sourceUrl: string,
  filename: string,
): Promise<string | null> {
  if (!isBunnyConfigured()) {
    console.warn("[bunny] env değişkenleri eksik, upload atlanıyor");
    return null;
  }

  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[bunny] source fetch ${res.status}: ${sourceUrl}`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "audio/mpeg";
    const buffer = await res.arrayBuffer();
    const sizeMb = (buffer.byteLength / 1024 / 1024).toFixed(2);

    const key = `songs/${filename}`;
    const putUrl = `https://${HOST}/${ZONE}/${PREFIX}/${key}`;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        AccessKey: PASSWORD,
        "Content-Type": contentType,
      },
      body: buffer,
    });
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => "");
      console.warn(`[bunny] upload ${putRes.status}: ${text.slice(0, 200)}`);
      return null;
    }

    console.log(`[bunny] ✓ audio ${sizeMb}MB → ${key}`);
    return key;
  } catch (e) {
    console.warn("[bunny] upload hatası:", e);
    return null;
  }
}

/**
 * Image upload — key döner (örn "covers/xxx.jpg").
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  filename: string,
): Promise<string | null> {
  if (!isBunnyConfigured()) return null;
  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    const key = `covers/${filename}`;
    const putRes = await fetch(`https://${HOST}/${ZONE}/${PREFIX}/${key}`, {
      method: "PUT",
      headers: { AccessKey: PASSWORD, "Content-Type": contentType },
      body: buffer,
    });
    if (!putRes.ok) return null;
    return key;
  } catch {
    return null;
  }
}

/**
 * Arka planda upload — await edilmez, callback'te DB güncellenir.
 */
export function uploadAudioInBackground(
  sourceUrl: string,
  filename: string,
  onSuccess: (key: string) => Promise<void> | void,
): void {
  uploadAudioFromUrl(sourceUrl, filename)
    .then((key) => {
      if (key) return onSuccess(key);
    })
    .catch((e) => console.warn("[bunny] background hatası:", e));
}

export function uploadImageInBackground(
  sourceUrl: string,
  filename: string,
  onSuccess: (key: string) => Promise<void> | void,
): void {
  uploadImageFromUrl(sourceUrl, filename)
    .then((key) => {
      if (key) return onSuccess(key);
    })
    .catch((e) => console.warn("[bunny] background image hatası:", e));
}
