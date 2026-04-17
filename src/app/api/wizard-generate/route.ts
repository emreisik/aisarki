import { NextRequest, NextResponse } from "next/server";
import { WizardGenerateRequest, SunoApiResponse } from "@/types";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { auth } from "@/auth";
import { translateSunoError } from "@/lib/sunoErrors";
import {
  ARTIST_PRESETS,
  GENRES,
  REGIONS,
  MAKAMS,
  type ArtistPresetId,
  type GenreId,
  type RegionId,
  type MakamId,
  buildSunoStyle,
  buildNegativeTags,
  resolveSunoParams,
} from "@/lib/turkishMusicKB";
import {
  resolveArtistPreset,
  resolveMakam,
  resolveLyricsBlueprint,
  ERA_STYLE_MODIFIERS,
  THEME_TEMPLATES,
  MOOD_EMOTION_LABELS,
  TURKISH_CLICHE_BLACKLIST,
} from "@/lib/wizardMappings";
import { applySunoOptimizations } from "@/lib/sunoGlossary";
import { chatCompletion, quickCompletion } from "@/lib/openai";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";
function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) {
    const base = raw.replace(/\/+$/, "");
    return `${base}/api/callback`;
  }
  const { origin } = new URL(request.url);
  return `${origin}/api/callback`;
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024,
): Promise<string> {
  return chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { model: "gpt-4o", maxTokens },
  );
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
    const body = await request.json();
    const {
      mood,
      genreId,
      theme,
      themeText,
      vocalGender,
      era,
      regionId,
      model: bodyModel,
      approvedLyrics,
      approvedTitle,
    } = body as WizardGenerateRequest & {
      approvedLyrics?: string;
      approvedTitle?: string;
    };

    if (!mood || !genreId) {
      return NextResponse.json(
        { error: "Duygu ve tarz seçimi zorunludur" },
        { status: 400 },
      );
    }

    // ── 1. Mood → Makam çözümleme ──
    const makamId = resolveMakam(mood);

    // ── 2. Mood + Genre → ArtistPreset çözümleme ──
    const validGenreId = genreId in GENRES ? (genreId as GenreId) : undefined;
    const artistId = validGenreId
      ? resolveArtistPreset(mood, validGenreId)
      : undefined;

    const validRegionId =
      regionId && regionId in REGIONS ? (regionId as RegionId) : undefined;
    const validMakamId = makamId in MAKAMS ? (makamId as MakamId) : undefined;

    // ── 3. KB fonksiyonlarıyla Suno parametreleri oluştur ──
    const kbStyle = buildSunoStyle({
      artistId,
      genreId: validGenreId,
      regionId: validRegionId,
      makamId: validMakamId,
      extraTags: era in ERA_STYLE_MODIFIERS ? [ERA_STYLE_MODIFIERS[era]] : [],
    });
    const kbNegativeTags = buildNegativeTags({
      artistId,
      genreId: validGenreId,
    });
    const kbParams = resolveSunoParams({
      artistId,
      genreId: validGenreId,
    });

    const isInstrumental = vocalGender === "instrumental";
    const finalVocalGender = isInstrumental
      ? undefined
      : vocalGender === "m" || vocalGender === "f"
        ? vocalGender
        : kbParams.vocalGender;

    // ── 4. Tema context'i hazırla ──
    const themeTemplate = THEME_TEMPLATES.find((t) => t.id === theme);
    const topicText =
      themeText.trim() ||
      themeTemplate?.contextHint ||
      "genel bir Türk şarkısı";
    const culturalDetails = themeTemplate?.culturalDetails?.join(", ") || "";
    const moodLabel = MOOD_EMOTION_LABELS[mood] || "";

    // ── 5. Claude ile paralel: başlık + sözler ──
    const artistPreset = artistId ? ARTIST_PRESETS[artistId] : undefined;
    const regionPreset = validRegionId ? REGIONS[validRegionId] : undefined;
    const makamPreset = validMakamId ? MAKAMS[validMakamId] : undefined;
    const genrePreset = validGenreId ? GENRES[validGenreId] : undefined;

    // ── Lyrics Blueprint çözümle ──
    const blueprint = validGenreId
      ? resolveLyricsBlueprint(validGenreId)
      : resolveLyricsBlueprint("sehir_pop" as GenreId);

    // Lyrics context
    const contextLines: string[] = [];
    if (artistPreset) {
      contextLines.push(`Tarz: ${artistPreset.label}`);
      contextLines.push(`Tarz açıklaması: ${artistPreset.lyricsStyle}`);
    }
    if (regionPreset) {
      contextLines.push(`Yöre: ${regionPreset.label}`);
      contextLines.push(
        `Yöresel temalar: ${regionPreset.lyricsThemes.join(", ")}`,
      );
      if (Object.keys(regionPreset.lyricsLehce).length > 0) {
        const lehceList = Object.entries(regionPreset.lyricsLehce)
          .map(([tr, lehce]) => `"${tr}" → "${lehce}"`)
          .join(", ");
        contextLines.push(`Yöresel ağız: ${lehceList}`);
      }
    }
    if (makamPreset) {
      contextLines.push(`Makam: ${makamPreset.label} — ${makamPreset.mood}`);
    }
    if (moodLabel) contextLines.push(`Duygu: ${moodLabel}`);
    if (culturalDetails)
      contextLines.push(`Kültürel imgeler: ${culturalDetails}`);

    const contextBlock =
      contextLines.length > 0
        ? `\nMüzikal bağlam:\n${contextLines.join("\n")}`
        : "";

    // Klişe kara listesi (genre-spesifik + genel)
    const allCliches = [
      ...TURKISH_CLICHE_BLACKLIST,
      ...blueprint.clicheBlacklist,
    ];
    const clicheList = allCliches
      .slice(0, 12)
      .map((c) => `"${c}"`)
      .join(", ");

    // Suno vokal tag'leri özet
    const voiceTagsNote = [
      blueprint.sunoVoiceTags.verse?.length
        ? `Verse'lerde: ${blueprint.sunoVoiceTags.verse.join(", ")}`
        : "",
      blueprint.sunoVoiceTags.chorus?.length
        ? `Chorus'ta: ${blueprint.sunoVoiceTags.chorus.join(", ")}`
        : "",
      blueprint.sunoVoiceTags.bridge?.length
        ? `Bridge'de: ${blueprint.sunoVoiceTags.bridge.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");

    const lyricsSystemPrompt = `Sen dünya çapında bir Türk müzik sözü yazarısın. Her tarzda profesyonel, söylenebilir, duygusal derinliği olan sözler yazarsın.

⛔ KRİTİK: Gerçek sanatçı/şarkıcı adı KULLANMA.
⛔ KLİŞE YASAK: Şu kalıpları ASLA kullanma: ${clicheList}

═══ YAPI KURALLARI ═══

HECE VEZNİ: ${blueprint.heceVezni}
Durak: ${blueprint.durak}
Her satırı parmakla say — hece sayısı tutarlı olmalı.

KAFİYE: ${blueprint.kafiyeDuzeni}
Kafiye tipi: ${blueprint.kafiyeTipi}
Kafiye doğal olsun — anlam kafiye uğruna feda edilmez.

BÖLÜM YAPISI:
${blueprint.sectionTemplate}

SATIR UZUNLUĞU: ${blueprint.lineTarget}
Nakarat (Chorus) verse'den KISA olmalı — akılda kalıcı, tekrar edilebilir hook.

═══ İÇERİK KURALLARI ═══

GÖSTER, SÖYLEME: Duyguyu doğrudan söyleme — bir SAHNE, HAREKET veya DUYUSAL DETAY ile göster.
✗ Kötü: "Çok üzgünüm" → ✓ İyi: "Bardağın kenarında dudak izi, soğumaya bırakmışım"
✗ Kötü: "Seni özledim" → ✓ İyi: "Mutfakta iki kişilik sofra kuruyorum hâlâ"

DUYGUSAL YAY: ${blueprint.emotionalArc}
Şarkı boyunca duygu ilerlemeli — başı ve sonu aynı yoğunlukta olmasın.

İMGE REHBERİ: ${blueprint.imageryGuide}
Her verse'te en az 2 somut duyusal detay (görsel, işitsel, koku, dokunma).

DİL: ${blueprint.languageRegister}

═══ SUNO OPTİMİZASYON ═══

Şu vokal tag'lerini uygun bölümlerin BAŞINA ekle: ${voiceTagsNote}
Bölümler arasında boş satır bırak.
Satır başında noktalama işareti kullanma.
Her chorus'ta hook satırını birebir tekrarla (Suno'nun öğrenmesi için).
Türkçe diyakritikleri eksiksiz kullan (ç, ğ, ı, ö, ş, ü).

Sadece sözleri yaz — açıklama, başlık veya yorum ekleme.`;

    const titleSystemPrompt = `Kısa, şiirsel bir Türkçe şarkı başlığı üret. Maksimum 5 kelime. Sadece başlığı yaz, başka hiçbir şey yazma. Tırnak işareti kullanma.`;

    const titleUserPrompt = `Duygu: ${moodLabel}
Tarz: ${genrePreset?.label || genreId}
Konu: ${topicText}

Başlık:`;

    const lyricsUserPrompt = `Şarkı konusu: ${topicText}${contextBlock}

Şarkı sözlerini yaz:`;

    // ── Onaylanmış lyrics varsa Claude'u atla ──
    let generatedTitle = approvedTitle || "";
    let generatedLyrics = approvedLyrics || "";

    if (!approvedLyrics && !approvedTitle) {
      // Kullanıcıdan hazır lyrics gelmedi — Claude ile üret
      if (process.env.OPENAI_API_KEY) {
        try {
          const promises: Promise<string>[] = [
            callClaude(titleSystemPrompt, titleUserPrompt, 64),
          ];
          if (!isInstrumental) {
            promises.push(
              callClaude(lyricsSystemPrompt, lyricsUserPrompt, 2048),
            );
          }

          const results = await Promise.all(promises);
          generatedTitle = results[0].trim().replace(/^["']|["']$/g, "");
          if (!isInstrumental && results[1]) {
            generatedLyrics = results[1];
          }
        } catch (claudeErr) {
          console.error("[wizard-generate] Claude fallback:", claudeErr);
          generatedTitle = topicText.slice(0, 30);
        }
      } else {
        generatedTitle = topicText.slice(0, 30);
      }
    }

    // ── 6. Suno Çeviri Katmanı — otomatik optimizasyonlar ──
    const sunoOpt = applySunoOptimizations({
      lyrics: generatedLyrics,
      regionId: validRegionId,
      makamId: validMakamId,
      genreId: validGenreId,
    });

    const hasLyrics = sunoOpt.optimizedLyrics.trim().length > 0;
    // customMode'da quality markers zaten style'da (buildSunoStyle ekliyor)
    // prompt alanı sadece lyrics veya konu metni içermeli
    const finalPrompt = isInstrumental
      ? ""
      : hasLyrics
        ? sunoOpt.optimizedLyrics
        : topicText;
    const useCustomMode = hasLyrics || isInstrumental;

    // Style'a Suno boost ekle (bölgesel tavır, makam scale, genre anchor)
    const finalStyle = sunoOpt.styleBoost
      ? `${kbStyle}, ${sunoOpt.styleBoost}`
      : kbStyle;

    const ALLOWED_MODELS = new Set([
      "V4",
      "V4_5",
      "V4_5PLUS",
      "V4_5ALL",
      "V5",
      "V5_5",
    ]);
    const validatedModel =
      bodyModel && ALLOWED_MODELS.has(bodyModel) ? bodyModel : undefined;
    const model = validatedModel ?? (artistId ? "V5" : "V4_5ALL");

    const callBackUrl = getCallbackUrl(request);

    const payload: Record<string, unknown> = {
      customMode: useCustomMode,
      instrumental: isInstrumental,
      model,
      prompt: finalPrompt,
      callBackUrl,
      negativeTags: kbNegativeTags,
      styleWeight: kbParams.styleWeight,
      weirdnessConstraint: kbParams.weirdnessConstraint,
      ...(useCustomMode ? { style: finalStyle } : {}),
      ...(generatedTitle ? { title: generatedTitle } : {}),
      ...(finalVocalGender ? { vocalGender: finalVocalGender } : {}),
    };

    console.log(
      "[wizard-generate] Suno payload:",
      JSON.stringify({
        mood,
        genreId,
        artistId,
        makamId,
        title: generatedTitle,
        model,
        era,
        styleLen: finalStyle.length,
        promptLen: finalPrompt.length,
        hasLyrics,
        useCustomMode,
      }),
    );

    // ── 7. Suno API çağrısı ──
    const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data: SunoApiResponse = await response.json();
    const taskId = data.data?.taskId;

    if (!response.ok || data.code !== 200) {
      console.log("[wizard-generate] Suno reject:", JSON.stringify(data));
      const rawData = data as unknown as Record<string, unknown>;
      const rawMsg: string =
        (rawData.message as string) ||
        (rawData.error as string) ||
        data.msg ||
        "Müzik oluşturulamadı";
      const translated = translateSunoError(data.code, rawMsg);
      const userMsg = `${translated.title}: ${translated.message}`;

      if (taskId) {
        saveProcessingTask(
          taskId,
          finalPrompt,
          session.user.id,
          body as unknown as Record<string, unknown>,
          "music",
        ).catch((e) =>
          console.error("[db] saveProcessingTask hatası (error):", e),
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

    if (taskId) {
      saveProcessingTask(
        taskId,
        finalPrompt,
        session.user.id,
        body as unknown as Record<string, unknown>,
        "music",
      ).catch((e) => console.error("[db] saveProcessingTask hatası:", e));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[wizard-generate] error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
