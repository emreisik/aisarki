import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, SunoApiResponse } from "@/types";
import { saveProcessingTask } from "@/lib/taskStore";
import { auth } from "@/auth";
import {
  ARTIST_PRESETS,
  GENRES,
  REGIONS,
  MAKAMS,
  ArtistPresetId,
  GenreId,
  RegionId,
  MakamId,
  buildSunoStyle,
  buildNegativeTags,
  resolveSunoParams,
  DEFAULT_NEGATIVE_TAGS,
  TURKISH_QUALITY_MARKERS,
} from "@/lib/turkishMusicKB";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

if (!SUNO_API_KEY && process.env.NODE_ENV === "production") {
  console.error("[generate] SUNO_API_KEY env değişkeni tanımlı değil");
}

function getCallbackUrl(request: NextRequest): string {
  // Use APP_URL env if set (production), otherwise derive from request origin
  if (process.env.APP_URL) {
    return `${process.env.APP_URL}/api/callback`;
  }
  const { origin } = new URL(request.url);
  return `${origin}/api/callback`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Şarkı oluşturmak için giriş yapman gerekiyor" },
      { status: 401 },
    );
  }

  try {
    const body: GenerateRequest = await request.json();
    const {
      prompt,
      style,
      title,
      instrumental = false,
      customMode = false,
      model: bodyModel,
      artistId,
      genreId,
      regionId,
      makamId,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
    } = body;

    const ALLOWED_MODELS = new Set([
      "V4",
      "V4_5",
      "V4_5PLUS",
      "V4_5ALL",
      "V5",
      "V5_5",
    ]);

    if (!prompt && !customMode) {
      return NextResponse.json({ error: "Prompt gereklidir" }, { status: 400 });
    }

    const callBackUrl = getCallbackUrl(request);

    // ── Türk Müzik Bilgi Tabanı entegrasyonu ──
    // artistId/genreId/regionId/makamId verildiyse bunlardan otomatik olarak
    // tüm Suno parametrelerini (style, negativeTags, styleWeight, weirdness, vocalGender) kur.
    const validArtistId =
      artistId && artistId in ARTIST_PRESETS
        ? (artistId as ArtistPresetId)
        : undefined;
    const validGenreId =
      genreId && genreId in GENRES ? (genreId as GenreId) : undefined;
    const validRegionId =
      regionId && regionId in REGIONS ? (regionId as RegionId) : undefined;
    const validMakamId =
      makamId && makamId in MAKAMS ? (makamId as MakamId) : undefined;

    const kbStyle = buildSunoStyle({
      artistId: validArtistId,
      genreId: validGenreId,
      regionId: validRegionId,
      makamId: validMakamId,
    });
    const kbNegativeTags = buildNegativeTags({
      artistId: validArtistId,
      genreId: validGenreId,
    });
    const kbParams = resolveSunoParams({
      artistId: validArtistId,
      genreId: validGenreId,
    });

    // Final değerler: kullanıcı override > KB > default
    const finalStyleWeight = styleWeight ?? kbParams.styleWeight;
    const finalWeirdness = weirdnessConstraint ?? kbParams.weirdnessConstraint;
    const finalVocalGender = vocalGender ?? kbParams.vocalGender;
    // Custom mode'da kullanıcı kendi style verirse ona ek olarak KB style koy
    const finalStyle = customMode
      ? style
        ? validArtistId || validGenreId || validRegionId || validMakamId
          ? `${style}, ${kbStyle}`
          : style
        : validArtistId || validGenreId || validRegionId || validMakamId
          ? kbStyle
          : undefined
      : undefined;
    // Negative tags: KB'den gelen + her zaman default anti-anglo
    const finalNegativeTags =
      kbNegativeTags && kbNegativeTags !== DEFAULT_NEGATIVE_TAGS
        ? kbNegativeTags
        : DEFAULT_NEGATIVE_TAGS;

    // Prompt suffix (sadece simple mode'da, custom mode'da lyrics zaten yazılı)
    const qualitySuffix = instrumental ? "" : `, ${TURKISH_QUALITY_MARKERS}`;
    const finalPrompt = customMode
      ? prompt || ""
      : (prompt || "") + qualitySuffix;

    // Model seçimi: kullanıcı UI'dan gönderdiyse onu kullan (valid olmak kaydıyla),
    // yoksa sanatçı persona varsa V5, yoksa V4_5ALL
    const validatedBodyModel =
      bodyModel && ALLOWED_MODELS.has(bodyModel) ? bodyModel : undefined;
    const model = validatedBodyModel ?? (validArtistId ? "V5" : "V4_5ALL");

    const payload: Record<string, unknown> = {
      customMode,
      instrumental,
      model,
      prompt: finalPrompt,
      callBackUrl,
      negativeTags: finalNegativeTags,
      styleWeight: finalStyleWeight,
      weirdnessConstraint: finalWeirdness,
      ...(finalVocalGender ? { vocalGender: finalVocalGender } : {}),
      ...(customMode && finalStyle ? { style: finalStyle } : {}),
      ...(customMode && title ? { title } : {}),
    };

    console.log("Calling Suno API with callBackUrl:", callBackUrl);

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data: SunoApiResponse = await response.json();

    console.log("Suno API response:", JSON.stringify(data, null, 2));

    // taskId'yi çıkar (error durumunda bile olabilir)
    const taskId = data.data?.taskId;

    if (!response.ok || data.code !== 200) {
      console.log("Suno reject:", JSON.stringify(data));
      // Suno bazen hatayı farklı field'larda döndürüyor
      const rawData = data as unknown as Record<string, unknown>;
      const rawMsg: string =
        (rawData.message as string) ||
        (rawData.error as string) ||
        data.msg ||
        "Müzik oluşturulamadı";

      // Hata mesajlarını Türkçeye çevir
      let userMsg = rawMsg;
      if (rawMsg.toLowerCase().includes("artist name")) {
        userMsg = `Prompt'ta sanatçı adı tespit edildi. Lütfen şu kelimeyi değiştir: "${rawMsg.match(/artist name (\w+)/i)?.[1] ?? ""}". Farklı bir ifade kullan.`;
      } else if (rawMsg.toLowerCase().includes("copyrighted")) {
        userMsg =
          "Şarkı üretilmedi: Telif hakkı korumalı içerik tespit edildi. Lütfen söz veya özellikleri değiştir ve tekrar deneyin.";
      }

      // Error durumunda bile taskId varsa kaydet (partial failure case)
      if (taskId) {
        const session = await auth();
        const userId = session?.user?.id ?? undefined;
        saveProcessingTask(taskId, finalPrompt, userId).catch((e) =>
          console.error("[db] saveProcessingTask hatası (error case):", e),
        );
      }

      return NextResponse.json({ error: userMsg }, { status: 400 });
    }

    // Başarılı case'de taskId'yi DB'ye kaydet
    if (taskId) {
      const session = await auth();
      const userId = session?.user?.id ?? undefined;
      saveProcessingTask(taskId, finalPrompt, userId).catch((e) =>
        console.error("[db] saveProcessingTask hatası:", e),
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
