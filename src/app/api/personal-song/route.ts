import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveProcessingTask, markTaskFailed } from "@/lib/taskStore";
import { translateSunoError } from "@/lib/sunoErrors";
import { checkCanGenerate, deductCredits } from "@/lib/credits";
import { chatCompletion } from "@/lib/openai";
import {
  OCCASIONS,
  INTENT_EXTRACTION_SYSTEM_PROMPT,
  type OccasionId,
} from "@/lib/occasions";
import {
  GENRES,
  buildSunoStyle,
  buildNegativeTags,
  resolveSunoParams,
  sanitizeSunoStyle,
  type GenreId,
} from "@/lib/turkishMusicKB";
import { applySunoOptimizations } from "@/lib/sunoGlossary";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

function getCallbackUrl(request: NextRequest): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) return `${raw.replace(/\/+$/, "")}/api/callback`;
  return `${new URL(request.url).origin}/api/callback`;
}

interface ExtractedIntent {
  occasion: OccasionId;
  isim: string | null;
  ikinci_isim: string | null;
  iliski: string | null;
  yas: number | null;
  detay: string | null;
  duygu_tonu: string;
  onerilen_genre: GenreId | null;
}

const FALLBACK_INTENT: ExtractedIntent = {
  occasion: "genel",
  isim: null,
  ikinci_isim: null,
  iliski: null,
  yas: null,
  detay: null,
  duygu_tonu: "huzurlu",
  onerilen_genre: null,
};

/**
 * Claude ile kullanıcının doğal dilini structured intent'e çevirir.
 * Hata olursa fallback intent döner — şarkı üretimi yine devam eder.
 */
async function extractIntent(freeText: string): Promise<ExtractedIntent> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK_INTENT;
  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: INTENT_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: freeText },
      ],
      { maxTokens: 256, temperature: 0.3 },
    );
    // Claude bazen ```json ile sarabiliyor — temizle
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<ExtractedIntent>;
    return {
      occasion: (parsed.occasion ?? "genel") as OccasionId,
      isim: parsed.isim ?? null,
      ikinci_isim: parsed.ikinci_isim ?? null,
      iliski: parsed.iliski ?? null,
      yas: typeof parsed.yas === "number" ? parsed.yas : null,
      detay: parsed.detay ?? null,
      duygu_tonu: parsed.duygu_tonu || "huzurlu",
      onerilen_genre: (parsed.onerilen_genre ?? null) as GenreId | null,
    };
  } catch (e) {
    console.warn("[personal-song] intent extraction failed:", e);
    return { ...FALLBACK_INTENT, detay: freeText.slice(0, 200) };
  }
}

/**
 * Occasion + extracted intent ile Claude'a verilecek lyrics context'i kurar.
 */
function buildLyricsUserPrompt(
  intent: ExtractedIntent,
  occasionLabel: string,
  lyricsBlueprint: string,
): string {
  const lines: string[] = [`Vesile: ${occasionLabel}`];
  if (intent.isim) lines.push(`Kişi adı: ${intent.isim}`);
  if (intent.ikinci_isim) lines.push(`İkinci kişi adı: ${intent.ikinci_isim}`);
  if (intent.iliski) lines.push(`İlişki: ${intent.iliski}`);
  if (intent.yas) lines.push(`Yaş: ${intent.yas}`);
  if (intent.detay) lines.push(`Özel detay/anılar: ${intent.detay}`);
  lines.push(`\nBölüm planı:\n${lyricsBlueprint}`);
  if (intent.isim) {
    lines.push(
      `\nÖNEMLİ: Şarkı içinde "${intent.isim}" adı en az 2 kez geçsin (chorus'ta ve bridge'de).`,
    );
  }
  lines.push("\nŞimdi sözleri yaz:");
  return lines.join("\n");
}

/**
 * Folk genre'lar için orkestral arrangement directive'leri lyrics'in başına
 * ve içine yerleştirir. wizard-generate'teki helper ile aynı mantık —
 * occasion sistemi de aynı orkestra logic'inden faydalansın diye.
 */
function buildPerformanceHeader(
  genreId: GenreId,
  intent: ExtractedIntent,
  occasionVibe: string,
): string {
  const moodMap: Record<string, string> = {
    huzunlu: "deep emotional sorrow, mournful",
    romantik: "warm romantic intimacy, devotional",
    coskulu: "joyful celebratory, uplifting energy",
    ozlem: "deep nostalgia, hasret yearning",
    nostaljik: "wistful nostalgic warmth, memory",
    huzurlu: "calm peaceful, contemplative",
    isyankar: "defiant proud, rebellious energy",
    enerjik: "energetic upbeat",
  };
  const moodCue = moodMap[intent.duygu_tonu] || "emotional warmth";

  // Folk için zengin block, diğerleri için occasion vibe
  const FOLK = new Set<GenreId>([
    "halk_turku",
    "ilahi_sufi",
    "tsm",
  ] as GenreId[]);
  if (FOLK.has(genreId)) {
    const tempo =
      genreId === "halk_turku"
        ? "70 BPM, slow rubato"
        : genreId === "ilahi_sufi"
          ? "75 BPM, contemplative"
          : "85 BPM, ottoman classical";
    const instruments =
      genreId === "halk_turku"
        ? "bağlama saz, kaval, mey, kemençe, davul, layered acoustic ensemble"
        : genreId === "ilahi_sufi"
          ? "ney flute, kanun, ud, daf, kudüm, layered devotional ensemble"
          : "ud, kanun, ney, kemençe, tambur, kudüm, full Ottoman ensemble";
    const arrangement =
      genreId === "halk_turku"
        ? "free-rhythm bağlama solo intro, ornamented kaval interlude, build-up with kemençe and davul, full ensemble at chorus, fading bağlama outro"
        : genreId === "ilahi_sufi"
          ? "ney taksim intro, sustained drone, daf rhythm building, layered choral chorus, ney fade outro"
          : "ud taksim intro, kanun and kemençe dialogue, full ensemble at chorus, ney solo outro";
    const vocals =
      genreId === "halk_turku"
        ? "powerful melismatic male vocal with çatlatma, traditional Anatolian folk ornamentation"
        : genreId === "ilahi_sufi"
          ? "devotional melismatic vocals, sustained notes, breathing pauses"
          : "classical Ottoman melismatic vocals, refined ornamentation";
    return (
      `[Genre: Turkish ${genreId === "halk_turku" ? "Anatolian folk türkü" : genreId === "ilahi_sufi" ? "Sufi ilahi" : "classical TSM"}]\n` +
      `[Style: ${occasionVibe}]\n` +
      `[Instruments: ${instruments}]\n` +
      `[Arrangement: ${arrangement}]\n` +
      `[Vocals: ${vocals}]\n` +
      `[Tempo: ${tempo}]\n` +
      `[Mood: ${moodCue}]\n\n`
    );
  }

  // Pop/akustik/diğer için sade ama yine etkili bir directive bloğu
  return (
    `[Genre: Turkish ${GENRES[genreId]?.label || genreId}]\n` +
    `[Style: ${occasionVibe}]\n` +
    `[Vocals: warm Turkish vocals, clear diction, emotional]\n` +
    `[Mood: ${moodCue}]\n\n`
  );
}

/**
 * Lyrics'in arasına intro/break/outro instrumental directives enjekte eder.
 * Kullanıcı flat şarkı yerine sahneli orkestral kompozisyon duysun.
 */
function injectArrangementBlocks(lyrics: string, genreId: GenreId): string {
  const intro =
    genreId === "halk_turku"
      ? "[Intro: solo bağlama melody, free rhythm rubato, 8 bars]"
      : genreId === "ilahi_sufi"
        ? "[Intro: ney flute taksim, free rhythm meditation, 8 bars]"
        : genreId === "tsm"
          ? "[Intro: ud taksim free rhythm, kanun arpeggios, 8 bars]"
          : genreId === "akustik"
            ? "[Intro: solo acoustic guitar fingerpicking, gentle, 6 bars]"
            : "[Intro: warm instrumental opening, 4 bars]";

  const breakBlock =
    genreId === "halk_turku"
      ? "[Instrumental break: kaval flute solo, 4 bars]"
      : genreId === "ilahi_sufi"
        ? "[Instrumental break: kanun cascade with ney, 4 bars]"
        : genreId === "tsm"
          ? "[Instrumental break: kanun and kemençe dialogue, 4 bars]"
          : genreId === "akustik"
            ? "[Instrumental break: acoustic guitar solo, 4 bars]"
            : "[Instrumental break: melodic interlude, 4 bars]";

  const outro =
    genreId === "halk_turku"
      ? "[Outro: solo bağlama fading, 4 bars]"
      : genreId === "ilahi_sufi"
        ? "[Outro: ney flute fading, 4 bars]"
        : genreId === "tsm"
          ? "[Outro: ud closing taksim, slow fade, 4 bars]"
          : genreId === "akustik"
            ? "[Outro: acoustic guitar gentle fade, 4 bars]"
            : "[Outro: gentle instrumental fade, 4 bars]";

  let out = lyrics.trim();
  if (!/^\s*\[Intro/i.test(out)) out = `${intro}\n\n${out}`;
  if (!/\[Instrumental break|\[Break|\[Solo/i.test(out)) {
    const m = out.match(/\n\s*\[Chorus/i);
    if (m && m.index !== undefined) {
      out = out.slice(0, m.index) + `\n\n${breakBlock}` + out.slice(m.index);
    }
  }
  if (!/\[Outro/i.test(out)) out = `${out}\n\n${outro}`;
  return out;
}

/**
 * POST /api/personal-song
 *
 * Body: { freeText: string, genre?: GenreId, model?: string }
 *
 * Akış:
 *   1. Claude ile freeText → ExtractedIntent
 *   2. Occasion template seçilir (intent.occasion)
 *   3. Genre belirlenir (kullanıcı override > intent.onerilen_genre > occasion.defaultGenre)
 *   4. Claude ile occasion-specific lyrics üretilir
 *   5. Performance header + arrangement bloklarını lyrics'e enjekte
 *   6. Suno'ya gönderim (custom mode)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      freeText: string;
      genre?: GenreId;
      model?: string;
    };
    const { freeText, genre: overrideGenre, model: bodyModel } = body;

    if (!freeText || freeText.trim().length === 0) {
      return NextResponse.json(
        { error: "Şarkı için bir açıklama yazman gerekiyor" },
        { status: 400 },
      );
    }
    if (freeText.length > 1500) {
      return NextResponse.json(
        { error: "Açıklama çok uzun, 1500 karakteri geçmesin" },
        { status: 400 },
      );
    }

    // ── 1. Intent extraction ──
    const intent = await extractIntent(freeText.trim());
    const occasion = OCCASIONS[intent.occasion] || OCCASIONS.genel;

    // ── 2. Genre seçimi: override > Claude önerisi > occasion default ──
    let genreId: GenreId = occasion.defaultGenre;
    if (overrideGenre && overrideGenre in GENRES) {
      genreId = overrideGenre;
    } else if (intent.onerilen_genre && intent.onerilen_genre in GENRES) {
      genreId = intent.onerilen_genre;
    }

    const genrePreset = GENRES[genreId];

    // ── 3. Kredi + model kontrolü ──
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
    const FOLK = new Set<GenreId>([
      "halk_turku",
      "ilahi_sufi",
      "tsm",
    ] as GenreId[]);
    const isFolk = FOLK.has(genreId);
    // Folk için V4_5ALL daha tutarlı, diğerleri için V5_5
    const model = validatedModel ?? (isFolk ? "V4_5ALL" : "V5_5");

    const check = await checkCanGenerate(session.user.id, {
      action: "generate",
      model,
    });
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.message || "Kredi yetersiz",
          code: check.error,
          credits: check.credits,
        },
        { status: check.error === "insufficient_credits" ? 402 : 403 },
      );
    }

    // ── 4. Title + Lyrics üretimi (Claude) ──
    let generatedTitle = "";
    let generatedLyrics = "";

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const titleSystemPrompt = `Kısa, şiirsel Türkçe şarkı başlığı üret. Maksimum 5 kelime. Sadece başlığı yaz, hiçbir açıklama yapma. Tırnak işareti kullanma.`;
        const titleUser = `Vesile: ${occasion.label}\nKişi: ${intent.isim || "—"}\nKonu: ${intent.detay || freeText.slice(0, 100)}\n\nBaşlık:`;

        const lyricsSystemPrompt = `Sen Türkçe şarkı sözü yazan profesyonel bir söz yazarısın. Sade, içten, söylenebilir, duygusal sözler yazarsın.

⛔ Gerçek sanatçı/şarkıcı adı KULLANMA.
⛔ Klişe ifadelerden kaçın.

═══ BU OCCASION İÇİN BAĞLAM ═══
${occasion.lyricsContext}

═══ KURALLAR ═══

KİŞİSEL: Verilen isim/ilişki/detayları MUTLAKA sözlere yedir. Genel değil, kişiye özel olsun.

KISA SATIRLAR: 7-11 hece arası, akıcı, söylenebilir.

NAĞMELİ: Satır sonları mümkünse uzun sesliyle bitsin (-a, -e, -ı, -i, -ım, -ın). Suno'nun melodik söylemesi için.

YAPI: Verilen bölüm planını takip et. [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro] tag'leriyle başlık.

CHORUS: Akılda kalıcı, kısa, BİREBİR tekrar.

DİL: Modern Türkçe, samimi sen dili. Aşırı edebi süs yok.

═══ FORMAT ═══

Bölüm tag'leri köşeli parantezle: [Verse 1] gibi.
Satır başında noktalama yok.
Türkçe diyakritikleri eksiksiz (ç, ğ, ı, ö, ş, ü).

Sadece sözleri yaz — açıklama, başlık, yorum YOK.`;

        const lyricsUser = buildLyricsUserPrompt(
          intent,
          occasion.label,
          occasion.lyricsBlueprint,
        );

        const [t, l] = await Promise.all([
          chatCompletion(
            [
              { role: "system", content: titleSystemPrompt },
              { role: "user", content: titleUser },
            ],
            { maxTokens: 64 },
          ),
          chatCompletion(
            [
              { role: "system", content: lyricsSystemPrompt },
              { role: "user", content: lyricsUser },
            ],
            { maxTokens: 1500 },
          ),
        ]);

        generatedTitle = t.trim().replace(/^["']|["']$/g, "");
        generatedLyrics = l.trim();
      } catch (e) {
        console.error("[personal-song] Claude failed:", e);
        generatedTitle = intent.isim
          ? `${intent.isim}'in Şarkısı`
          : freeText.slice(0, 30);
      }
    } else {
      generatedTitle = intent.isim
        ? `${intent.isim}'in Şarkısı`
        : freeText.slice(0, 30);
    }

    // ── 5. Style + performance header ──
    const sunoOpt = applySunoOptimizations({
      lyrics: generatedLyrics,
      genreId,
    });

    const kbStyle = buildSunoStyle({ genreId });
    const kbNegativeTags = buildNegativeTags({ genreId });
    const kbParams = resolveSunoParams({ genreId });

    const performanceHeader = generatedLyrics
      ? buildPerformanceHeader(genreId, intent, occasion.defaultVibe)
      : "";

    const lyricsWithDirectives = generatedLyrics
      ? performanceHeader +
        injectArrangementBlocks(sunoOpt.optimizedLyrics, genreId)
      : "";

    const hasLyrics = lyricsWithDirectives.trim().length > 0;
    const useCustomMode = hasLyrics;

    // Suno limitleri
    const SUNO_NON_CUSTOM = 500;
    const SUNO_CUSTOM = 4500;
    const rawPrompt = hasLyrics ? lyricsWithDirectives : freeText.trim();
    const finalPrompt = useCustomMode
      ? rawPrompt.length > SUNO_CUSTOM
        ? rawPrompt.slice(0, SUNO_CUSTOM)
        : rawPrompt
      : rawPrompt.length > SUNO_NON_CUSTOM
        ? rawPrompt.slice(0, SUNO_NON_CUSTOM)
        : rawPrompt;

    // Style — occasion vibe başta (sanitize 180 limit'inde korunsun)
    const finalStyle = sanitizeSunoStyle(
      [occasion.defaultVibe, kbStyle, sunoOpt.styleBoost]
        .filter(Boolean)
        .join(", "),
    );

    // Folk için sıkı parametreler
    const finalStyleWeight = isFolk
      ? Math.max(0.85, kbParams.styleWeight)
      : kbParams.styleWeight;
    const finalWeirdness = isFolk
      ? Math.min(0.15, kbParams.weirdnessConstraint)
      : kbParams.weirdnessConstraint;

    const finalNegativeTags = isFolk
      ? `${kbNegativeTags}, pop production, electronic drums, modern beat, club music, EDM, autotune`
          .split(",")
          .map((s) => s.trim())
          .filter((s, i, a) => s && a.indexOf(s) === i)
          .join(", ")
          .slice(0, 180)
      : kbNegativeTags;

    const finalVocalGender = kbParams.vocalGender;

    const callBackUrl = getCallbackUrl(request);

    const payload: Record<string, unknown> = {
      customMode: useCustomMode,
      instrumental: false,
      model,
      prompt: finalPrompt,
      callBackUrl,
      negativeTags: finalNegativeTags,
      styleWeight: finalStyleWeight,
      weirdnessConstraint: finalWeirdness,
      ...(useCustomMode ? { style: finalStyle } : {}),
      ...(generatedTitle ? { title: generatedTitle.slice(0, 100) } : {}),
      ...(finalVocalGender ? { vocalGender: finalVocalGender } : {}),
    };

    console.log(
      "[personal-song] payload:",
      JSON.stringify({
        occasion: intent.occasion,
        isim: intent.isim,
        genreId,
        model,
        title: generatedTitle,
        styleLen: finalStyle.length,
        promptLen: finalPrompt.length,
        hasLyrics,
      }),
    );

    // ── 6. Suno call ──
    const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const taskId = data.data?.taskId;

    if (!response.ok || data.code !== 200) {
      console.warn("[personal-song] Suno reject:", JSON.stringify(data));
      const translated = translateSunoError(
        data.code,
        data.message || data.msg || "Şarkı oluşturulamadı",
      );
      if (taskId) {
        saveProcessingTask(
          taskId,
          freeText.trim(),
          session.user.id,
          { ...body, intent } as unknown as Record<string, unknown>,
          "music",
        ).catch(() => {});
        markTaskFailed(taskId, translated.title, translated.message).catch(
          () => {},
        );
      }
      return NextResponse.json(
        {
          error: `${translated.title}: ${translated.message}`,
          errorTitle: translated.title,
          errorCode: data.code,
        },
        { status: 400 },
      );
    }

    if (taskId) {
      saveProcessingTask(
        taskId,
        freeText.trim(),
        session.user.id,
        { ...body, intent } as unknown as Record<string, unknown>,
        "music",
      ).catch(() => {});

      await deductCredits(
        session.user.id,
        check.cost,
        "generate",
        taskId,
      ).catch((e) => console.error("[credits] deduct hatası:", e));
    }

    return NextResponse.json({ ...data, intent, occasion: occasion.id });
  } catch (error) {
    console.error("[personal-song] error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
