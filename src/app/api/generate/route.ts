import { NextRequest, NextResponse } from "next/server";
import { GenerateRequest, SunoApiResponse } from "@/types";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { auth } from "@/auth";
import { translateSunoError } from "@/lib/sunoErrors";
import { checkCanGenerate, deductCredits } from "@/lib/credits";
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
  sanitizeSunoStyle,
  DEFAULT_NEGATIVE_TAGS,
} from "@/lib/turkishMusicKB";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

if (!SUNO_API_KEY && process.env.NODE_ENV === "production") {
  console.error("[generate] SUNO_API_KEY env değişkeni tanımlı değil");
}

function getCallbackUrl(request: NextRequest): string {
  // APP_URL env varsa kullan; Railway/Vercel dashboard'da yanlışlıkla
  // newline/whitespace/trailing slash gelebiliyor — savunmacı normalize et.
  const raw = process.env.APP_URL?.trim();
  if (raw) {
    const base = raw.replace(/\/+$/, "");
    return `${base}/api/callback`;
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
      personaId,
      personaModel,
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

    // ── Kredi + model kilidi kontrolü ──
    const check = await checkCanGenerate(session.user.id, {
      action: "generate",
      model: bodyModel,
    });
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.message || "Kredi yetersiz",
          code: check.error,
          credits: check.credits,
          planId: check.plan.id,
        },
        { status: check.error === "insufficient_credits" ? 402 : 403 },
      );
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
    // Custom mode'da kullanıcı kendi style verirse ona ek olarak KB style koy.
    // Son adımda sanitize — kullanıcı "oyun havası" gibi Suno filtresini
    // tetikleyen Türkçe compound'lar yazsa bile güvenli hale gelir.
    const rawFinalStyle = customMode
      ? style
        ? validArtistId || validGenreId || validRegionId || validMakamId
          ? `${style}, ${kbStyle}`
          : style
        : validArtistId || validGenreId || validRegionId || validMakamId
          ? kbStyle
          : undefined
      : undefined;
    const finalStyle = rawFinalStyle
      ? sanitizeSunoStyle(rawFinalStyle)
      : undefined;
    // Negative tags: KB'den gelen + her zaman default anti-anglo
    const finalNegativeTags =
      kbNegativeTags && kbNegativeTags !== DEFAULT_NEGATIVE_TAGS
        ? kbNegativeTags
        : DEFAULT_NEGATIVE_TAGS;

    // Non-custom mode'da Suno prompt'u max 500 karakter kabul ediyor ve
    // diğer alanların boş olmasını istiyor. TURKISH_QUALITY_MARKERS +
    // PHONETIC_HINTS tek başına ~700 char → limit aşılıyor, 400 dönüyor.
    // Quality suffix'i sadece custom mode'un style alanında kullanmak anlamlı;
    // simple mode prompt'a eklenmesi Suno'yu karıştırıyor + limiti aşıyor.
    const SUNO_NON_CUSTOM_PROMPT_LIMIT = 500;
    const rawPrompt = prompt || "";
    const finalPrompt = customMode
      ? rawPrompt
      : rawPrompt.length > SUNO_NON_CUSTOM_PROMPT_LIMIT
        ? rawPrompt.slice(0, SUNO_NON_CUSTOM_PROMPT_LIMIT)
        : rawPrompt;

    // Model seçimi: kullanıcı UI'dan gönderdiyse onu kullan (valid olmak kaydıyla),
    // yoksa sanatçı persona varsa V5, yoksa V4_5ALL
    // voice_persona ise V5+ zorla
    const V5_MODELS = new Set(["V5", "V5_5"]);
    const needsV5 =
      personaId && (personaModel === "voice_persona" || !personaModel);
    const validatedBodyModel =
      bodyModel && ALLOWED_MODELS.has(bodyModel) ? bodyModel : undefined;
    const model = validatedBodyModel
      ? needsV5 && !V5_MODELS.has(validatedBodyModel)
        ? "V5_5"
        : validatedBodyModel
      : needsV5
        ? "V5_5"
        : "V5_5";

    // Suno: non-custom mode'da SADECE prompt + zorunlu alanlar; style/title/
    // negativeTags/styleWeight/weirdnessConstraint/vocalGender/personaId yalnız
    // custom mode'da kabul ediliyor — diğerinde 400 dönüyor.
    const payload: Record<string, unknown> = {
      customMode,
      instrumental,
      model,
      prompt: finalPrompt,
      callBackUrl,
      ...(customMode
        ? {
            negativeTags: finalNegativeTags,
            styleWeight: finalStyleWeight,
            weirdnessConstraint: finalWeirdness,
            ...(finalVocalGender ? { vocalGender: finalVocalGender } : {}),
            ...(finalStyle ? { style: finalStyle } : {}),
            ...(title ? { title } : {}),
            ...(personaId ? { personaId } : {}),
            ...(personaId
              ? { personaModel: personaModel || "voice_persona" }
              : {}),
          }
        : {}),
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
      const rawData = data as unknown as Record<string, unknown>;
      const rawMsg: string =
        (rawData.message as string) ||
        (rawData.error as string) ||
        data.msg ||
        "Müzik oluşturulamadı";

      // Suno hata kodunu Türkçe kullanıcı mesajına çevir
      const translated = translateSunoError(data.code, rawMsg);
      const userMsg = `${translated.title}: ${translated.message}`;

      // Error durumunda taskId varsa kaydet + failed olarak işaretle
      if (taskId) {
        saveProcessingTask(
          taskId,
          finalPrompt,
          session.user.id,
          body as unknown as Record<string, unknown>,
          "music",
        ).catch((e) =>
          console.error("[db] saveProcessingTask hatası (error case):", e),
        );
        markTaskFailed(taskId, translated.title, translated.message).catch(
          () => {},
        );
      }

      return NextResponse.json(
        { error: userMsg, errorTitle: translated.title, errorCode: data.code },
        { status: 400 },
      );
    }

    // Başarılı case'de taskId'yi + tam payload'ı kaydet (retry için)
    if (taskId) {
      saveProcessingTask(
        taskId,
        finalPrompt,
        session.user.id,
        body as unknown as Record<string, unknown>,
        "music",
      ).catch((e) => console.error("[db] saveProcessingTask hatası:", e));

      // Kredi düşümü — atomik, race'e dayanıklı
      await deductCredits(
        session.user.id,
        check.cost,
        "generate",
        taskId,
      ).catch((e) => console.error("[credits] deduct hatası:", e));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
