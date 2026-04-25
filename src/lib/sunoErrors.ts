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

  // Suno record-info string kodları (lower-case)
  create_task_failed: {
    title: "Üretim başlatılamadı",
    message:
      "Suno şarkı üretimini başlatamadı. Kredin iade edildi. Lütfen tekrar dene.",
    refunded: true,
  },
  generate_audio_failed: {
    title: "Ses üretilemedi",
    message:
      "Şarkı üretimi sırasında bir hata oluştu. Kredin iade edildi. Lütfen tekrar dene.",
    refunded: true,
  },
  callback_exception: {
    title: "Callback hatası",
    message:
      "Suno yanıtı alınırken bir sorun oluştu. Kredin iade edildi. Lütfen tekrar dene.",
    refunded: true,
  },
  sensitive_word_error: {
    title: "İçerik filtresi",
    message:
      "Prompt veya sözlerde Suno filtresinin engellediği bir kelime tespit edildi. İçeriği değiştirip tekrar dene.",
    refunded: true,
  },
  lyrics_generate_failed: {
    title: "Sözler üretilemedi",
    message:
      "Şarkı sözleri üretilemedi. Kredin iade edildi. Lütfen tekrar dene.",
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

  // Yüklenen dosyada telif korumalı sözler — cover/upload-extend için en sık hata
  if (
    (msg.includes("uploaded audio") || msg.includes("upload")) &&
    (msg.includes("copyrighted") || msg.includes("copyright"))
  ) {
    return {
      title: "Telifli içerik tespit edildi",
      message:
        "Yüklediğin ses dosyası telif korumalı sözler içeriyor. Lütfen farklı bir dosya yükleyip tekrar dene.",
      refunded: true,
    };
  }
  // Tag içinde sanatçı adı (Suno upload filtresinin sık verdiği)
  if (
    (msg.includes("tags") || msg.includes("tag")) &&
    msg.includes("artist name")
  ) {
    return {
      title: "Tarz alanında sanatçı adı",
      message:
        "Tarz/etiket alanında bir sanatçı adı algılandı (Suno telif politikası). Lütfen ismi kaldırıp sadece tarz olarak tarif et.",
      refunded: true,
    };
  }
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
  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("frequency")
  ) {
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
 * Frontend yardımcısı — API'den gelen `error` (string veya {error, errorTitle})
 * payload'ını her zaman kullanıcıya gösterilebilir Türkçe { title, message } olarak
 * normalize eder. Mesaj İngilizce Suno hatasıysa translateSunoError ile çevrilir.
 */
export function localizeApiError(
  payload:
    | string
    | {
        error?: string;
        errorTitle?: string;
        errorMessage?: string;
        msg?: string;
        message?: string;
        code?: number | string;
      }
    | null
    | undefined,
  fallbackTitle: string = "Bir hata oluştu",
): { title: string; message?: string } {
  if (!payload) return { title: fallbackTitle };
  if (typeof payload === "string") {
    return localizeApiError({ error: payload }, fallbackTitle);
  }
  // errorTitle/errorMessage zaten Türkçeleştirilmiş geldi
  if (payload.errorTitle || payload.errorMessage) {
    return {
      title: payload.errorTitle ?? fallbackTitle,
      message: payload.errorMessage,
    };
  }
  const raw = payload.error || payload.msg || payload.message || "";
  // Karakter setine bak — non-ASCII (Türkçe diakritikler) varsa çoğunlukla
  // backend zaten translate etmiş demektir.
  const looksTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(raw);
  if (raw && looksTurkish) {
    return { title: fallbackTitle, message: raw };
  }
  // İngilizce raw mesaj — translateSunoError'dan geçir
  if (raw) {
    const t = translateSunoError(payload.code, raw);
    return { title: t.title, message: t.message };
  }
  return { title: fallbackTitle };
}

/**
 * Suno record-info / callback response'unda hata olduğunu gösteren status değerleri.
 * Upper-case döner (Suno): "CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED",
 * "CALLBACK_EXCEPTION", "SENSITIVE_WORD_ERROR", ayrıca lower-case "failed"/"error".
 */
const FAILURE_STATUSES = new Set([
  "failed",
  "error",
  "create_task_failed",
  "generate_audio_failed",
  "callback_exception",
  "sensitive_word_error",
  "lyrics_generate_failed",
]);

/**
 * Response body'den hata olup olmadığını tespit et.
 * Üç format destekler:
 *   1) Top-level { code, msg } (generate endpoint reject)
 *   2) Callback body → data.status / data.errorCode
 *   3) record-info response → data.data.status (upper-case "CREATE_TASK_FAILED" vb.)
 */
export function extractSunoError(
  body: unknown,
): { code?: number | string; message: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  // 1) Top-level code
  if (typeof b.code === "number" && b.code !== 200) {
    return {
      code: b.code,
      message: (b.msg as string) || (b.message as string) || "Hata oluştu",
    };
  }

  const data = b.data as Record<string, unknown> | undefined;
  if (!data) return null;

  // 2) Callback formatı: body.data.status
  const directStatus = (data.status as string | undefined)?.toLowerCase();
  if (directStatus && FAILURE_STATUSES.has(directStatus)) {
    return {
      code: (data.errorCode as number | string) || directStatus,
      message:
        (data.errorMessage as string) ||
        (data.error as string) ||
        (b.msg as string) ||
        "Task failed",
    };
  }

  // 3) record-info formatı: body.data.data.status veya body.data.response.status
  const nested =
    (data.data as Record<string, unknown> | undefined) ||
    (data.response as Record<string, unknown> | undefined);
  const nestedStatus = (nested?.status as string | undefined)?.toLowerCase();
  if (nestedStatus && FAILURE_STATUSES.has(nestedStatus)) {
    return {
      code: (nested?.errorCode as number | string) || nestedStatus,
      message:
        (nested?.errorMessage as string) ||
        (data.errorMessage as string) ||
        (b.msg as string) ||
        "Task failed",
    };
  }

  return null;
}

/**
 * record-info response'u için özel: data.data.status değerini kontrol eder,
 * failure ise { code, message } döner. Başarılı veya hala processing ise null.
 */
export function extractRecordInfoStatus(
  body: unknown,
): { failed: true; code?: number | string; message: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const outer = b.data as Record<string, unknown> | undefined;
  if (!outer) return null;
  // Suno record-info: { code:200, data: { status: "...", errorCode, errorMessage, response: {...} } }
  const statusRaw = (outer.status as string | undefined) || "";
  const status = statusRaw.toLowerCase();
  if (status && FAILURE_STATUSES.has(status)) {
    return {
      failed: true,
      code: (outer.errorCode as number | string) || status,
      message:
        (outer.errorMessage as string) ||
        (b.msg as string) ||
        statusRaw ||
        "Task failed",
    };
  }
  return null;
}
