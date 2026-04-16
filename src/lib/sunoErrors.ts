/**
 * Suno API hata kodlarını kullanıcıya Türkçe mesaj olarak çevirir.
 * Suno docs ve gerçek üretim sırasında karşılaşılan kodlar.
 */

interface ErrorInfo {
  title: string; // Kısa başlık
  message: string; // Detaylı Türkçe açıklama
  refunded?: boolean; // Kredi iade edildiyse
}

const ERROR_MAP: Record<number | string, ErrorInfo> = {
  // İstek sorunları
  400: {
    title: "Geçersiz istek",
    message:
      "Gönderilen bilgilerde bir sorun var. Lütfen şarkı bilgilerini kontrol edip tekrar dene.",
  },
  401: {
    title: "Yetkisiz",
    message:
      "API kimlik doğrulaması başarısız. Lütfen destek ile iletişime geç.",
  },
  404: {
    title: "Bulunamadı",
    message: "İstek geçersiz bir adrese gönderildi.",
  },
  405: {
    title: "Oran sınırı aşıldı",
    message: "Çok fazla istek gönderildi. Birkaç saniye bekleyip tekrar dene.",
  },
  413: {
    title: "Prompt çok uzun",
    message:
      "Açıklama 500 karakteri geçiyor. Lütfen daha kısa bir açıklama yaz.",
  },
  429: {
    title: "Kredi yetersiz",
    message: "Şarkı oluşturmak için yeterli kredin yok.",
  },
  430: {
    title: "Çok sık istek",
    message: "Kısa sürede çok fazla şarkı denendi. Lütfen 10 saniye bekle.",
  },
  455: {
    title: "Bakım modu",
    message: "Suno şu anda bakımda. Lütfen birkaç dakika sonra tekrar dene.",
  },
  500: {
    title: "Sunucu hatası",
    message: "Suno tarafında geçici bir sorun var. Lütfen tekrar dene.",
  },

  // Task-level errors (üretim başladı ama başarısız oldu)
  531: {
    title: "Sözlerde sorun",
    message:
      "Şarkı oluşturulamadı. Sözlerin boş, çok kısa veya hatalı biçimde olabilir. Lütfen sözleri kontrol edip tekrar dene.",
    refunded: true,
  },
  532: {
    title: "İçerik filtresi",
    message:
      "Şarkı telif korumalı içerik veya sanatçı ismi içerdiği için üretilemedi. Sözleri/stili değiştirip tekrar dene.",
    refunded: true,
  },
  533: {
    title: "Sanatçı adı tespit edildi",
    message:
      "Şarkı girdinizde gerçek bir sanatçı adı tespit edildi (Suno telif politikası). Lütfen ismi kaldırıp tarz olarak tarif et (örn 'arabesk tarzı').",
    refunded: true,
  },
  534: {
    title: "Prompt uygunsuz",
    message:
      "Prompt Suno içerik politikasını ihlal ediyor. Lütfen içeriği değiştirip tekrar dene.",
    refunded: true,
  },

  // Genel task failed
  task_failed: {
    title: "Üretim başarısız",
    message:
      "Şarkı üretimi tamamlanamadı. Kredilerin iade edildi. Lütfen girdiği bilgileri kontrol edip tekrar dene.",
    refunded: true,
  },
};

/**
 * Suno error code/message'i kullanıcı dostu Türkçe mesaja çevir.
 * Ayrıca callback mesajındaki anahtar kelimelerden sebebi tahmin eder.
 */
export function translateSunoError(
  code?: number | string,
  rawMessage?: string,
): ErrorInfo {
  // Explicit code match
  if (code != null && ERROR_MAP[code]) return ERROR_MAP[code];

  // Mesaj içeriğinden çıkarım
  const msg = (rawMessage ?? "").toLowerCase();
  if (msg.includes("artist name") || msg.includes("sanatçı")) {
    return ERROR_MAP[533];
  }
  if (
    msg.includes("copyright") ||
    msg.includes("copyrighted") ||
    msg.includes("telif")
  ) {
    return ERROR_MAP[532];
  }
  if (
    msg.includes("lyrics") &&
    (msg.includes("empty") ||
      msg.includes("short") ||
      msg.includes("malformed"))
  ) {
    return ERROR_MAP[531];
  }
  if (msg.includes("credits refunded") || msg.includes("task failed")) {
    return ERROR_MAP[531];
  }
  if (msg.includes("insufficient") || msg.includes("credit")) {
    return ERROR_MAP[429];
  }
  if (msg.includes("rate") || msg.includes("frequency")) {
    return ERROR_MAP[430];
  }

  // Bilinmeyen hata — genel mesaj
  return {
    title: "Üretim başarısız",
    message: rawMessage
      ? `Şarkı oluşturulamadı: ${rawMessage}`
      : "Şarkı üretilemedi. Kredin iade edildi. Lütfen tekrar dene.",
    refunded: true,
  };
}

/**
 * Response body'den hata olup olmadığını tespit et.
 * Suno farklı formatlarda dönebilir: { code, msg } veya nested.
 */
export function extractSunoError(
  body: unknown,
): { code?: number | string; message: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  // Top-level code
  if (typeof b.code === "number" && b.code !== 200) {
    return {
      code: b.code,
      message: (b.msg as string) || (b.message as string) || "Hata oluştu",
    };
  }

  // Nested data.status = "failed" / "error"
  const data = b.data as Record<string, unknown> | undefined;
  if (data) {
    const status = (data.status as string)?.toLowerCase?.();
    if (status === "failed" || status === "error") {
      return {
        code: (data.errorCode as number | string) || "task_failed",
        message:
          (data.errorMessage as string) ||
          (data.error as string) ||
          (b.msg as string) ||
          "Task failed",
      };
    }
  }

  return null;
}
