/**
 * Paylaşım yardımcıları — sosyal kanallar ve clipboard.
 */

export type ShareChannel =
  | "x"
  | "facebook"
  | "linkedin"
  | "reddit"
  | "email"
  | "copy"
  | "native";

export interface ShareTarget {
  url: string;
  title?: string;
  text?: string;
}

/** Kanala göre bir paylaşım URL'i üret (popup ile açılır). */
export function buildShareUrl(
  channel: Exclude<ShareChannel, "copy" | "native">,
  target: ShareTarget,
): string {
  const u = encodeURIComponent(target.url);
  const t = encodeURIComponent(target.title ?? "");
  const x = encodeURIComponent(target.text ?? target.title ?? "");
  switch (channel) {
    case "x":
      return `https://twitter.com/intent/tweet?url=${u}&text=${x}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case "email":
      return `mailto:?subject=${t}&body=${x}%0A%0A${u}`;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback aşağıda */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Native share (mobilde) dener, başarısızsa clipboard'a kopyalar. */
export async function shareOrCopy(
  target: ShareTarget,
): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await (
        navigator as Navigator & {
          share: (d: ShareTarget) => Promise<void>;
        }
      ).share(target);
      return "shared";
    }
  } catch {
    /* iptal / desteklemiyor */
  }
  const ok = await copyToClipboard(target.url);
  return ok ? "copied" : "failed";
}

/** Tek bir kanalda paylaş (popup aç veya clipboard). */
export async function shareVia(
  channel: ShareChannel,
  target: ShareTarget,
): Promise<"shared" | "copied" | "failed"> {
  if (channel === "native") {
    return shareOrCopy(target);
  }
  if (channel === "copy") {
    const ok = await copyToClipboard(target.url);
    return ok ? "copied" : "failed";
  }
  const url = buildShareUrl(channel, target);
  if (typeof window !== "undefined") {
    const popup = window.open(
      url,
      "_blank",
      "noopener,noreferrer,width=600,height=500",
    );
    if (popup) return "shared";
  }
  return "failed";
}
