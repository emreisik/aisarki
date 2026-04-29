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
  sanitizeSunoStyle,
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
    { maxTokens },
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

    // Folk/türkü için ayrı sade prompt — over-engineered kurallar yerine
    // melodik söylenebilirlik ve duygu öncelikli. Suno'nun "okuma" yapmasını
    // engellemek için kısa satır + uzun sesli ile biten kelime + tekrarlı hook.
    const FOLK_GENRE_IDS = new Set(["halk_turku", "ilahi_sufi", "tsm"]);
    const isFolkPrompt = validGenreId && FOLK_GENRE_IDS.has(validGenreId);

    const lyricsSystemPrompt = isFolkPrompt
      ? `Sen Anadolu türkü geleneğinde söz yazan bir ozansın. Sade, duygusal, söylenebilir türkü sözleri yazarsın.

⛔ Gerçek sanatçı adı kullanma.
⛔ Şehirli/teknolojik kelimeler kullanma.
⛔ Karmaşık edebi süs yapma — toprak gibi sade ol.

═══ TÜRKÜ KURALLARI ═══

KISA SATIRLAR: 7-11 hece arası. Her satır kısa, akıcı, nefessiz söylenebilir olsun.

NAĞMELİ SATIRLAR: Her satır mümkünse uzun sesliyle bitsin (-a, -e, -ı, -i, -o, -u, -ü, -ım, -ın). Suno'nun melisma yapması için. Örnek:
✓ "Dağların ardında yârim a"  (uzun a ile biter, melodik)
✗ "Dağlarda yârim var benim"  (kapalı, düz okunur)

SADE DİL: Halk dili — "yâri", "gönül", "garip", "kara gözlüm", "dağlar", "yayla", "dere". Ozanca sen dili.

YAPI:
[Verse 1] — 4 kısa satır, manzara/sahne (dağ, dere, yayla, sabah)
[Verse 2] — 4 satır, duyguyu derinleştir
[Chorus] — 2-3 satır, akılda kalıcı, kısa, ses ses tekrarla
[Verse 3] — 4 satır, kabullenme/sonuç
[Outro] — 2 satır, sessiz kapanış

KAFİYE: Doğal, zorlamasız. Anlamı feda etme. abab veya cccb şeması.

DUYGU: Tek bir duygu yoğunlaşsın (özlem, hasret, vuslat, kabullenme). Çatlak ses, içten yakarış hissi ver — ama abartma.

═══ FORMAT ═══

Bölümleri köşeli parantezle başlat: [Verse 1], [Chorus] gibi.
Bölümler arasında boş satır bırak.
Satır başında noktalama işareti kullanma.
Türkçe diyakritikleri eksiksiz kullan (ç, ğ, ı, ö, ş, ü).
Chorus'u her tekrarda BİREBİR aynı yaz.

Sadece sözleri yaz — açıklama, başlık veya yorum ekleme.`
      : `Sen dünya çapında bir Türk müzik sözü yazarısın. Her tarzda profesyonel, söylenebilir, duygusal derinliği olan sözler yazarsın.

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
      if (process.env.ANTHROPIC_API_KEY) {
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

    // ── Türkü/folk genre detect — vokal "okuma" sorununu çözmek için ──
    // Suno türkü için melismatic vocal + slow tempo + traditional ornamentation
    // cue'ları olmadan default olarak hızlı/düz okuyor. Lyrics ve style'a
    // folk-specific performance directive enjekte ediyoruz.
    const FOLK_GENRES: Set<GenreId> = new Set([
      "halk_turku",
      "ilahi_sufi",
      "tsm",
    ] as GenreId[]);
    const isFolk = validGenreId && FOLK_GENRES.has(validGenreId);

    // ── Folk performance directive bloğu — Suno'yu folk interpretation'a kilitle ──
    // Suno V5+ batılı model: "Turkish folk" terimini iyi anlamıyor. Çözüm:
    // 1. Western anchor (rebetiko, Celtic ballad) → tanıdık referans
    // 2. Specific instruments (saz, kaval) → enstrümantasyonu zorla
    // 3. Tempo + Mood → duygu ve hız Suno'ya açıkça gider
    // 4. Region varsa rhythm hint (7/8 horon, 9/8 zeybek) → ritmik karakter
    let folkPerformanceHeader = "";
    let folkStyleAddon = "";
    if (isFolk) {
      const moodEnglish = MOOD_EMOTION_LABELS[mood] || "deep emotional";
      const moodMap: Record<string, string> = {
        Hüzün: "deep longing, hasret melancholy, mournful soul",
        Sevinç: "warm joy, hopeful brightness, celebratory",
        Aşk: "passionate longing, deep love, devotional",
        Yalnızlık: "solitary contemplation, lonely night, isolated",
        Gurur: "proud dignified, defiant strength",
        Özlem: "deep nostalgia, hasret yearning, missing home",
        Hasret: "deep longing, missing the beloved, painful absence",
        Vuslat: "reunion bliss, fulfilled love",
        Tövbe: "repentant sorrow, spiritual seeking",
        Hayranlık: "awe-struck reverence",
      };
      const moodCue = moodMap[moodEnglish] || moodEnglish;

      const regionRhythmHint = validRegionId
        ? validRegionId === "karadeniz"
          ? "7/8 horon rhythm, fast"
          : validRegionId === "ege"
            ? "9/8 zeybek rhythm, slow heavy"
            : validRegionId === "ic_anadolu"
              ? "free rhythm rubato, sparse"
              : validRegionId === "trakya"
                ? "9/8 aksak Romani rhythm"
                : validRegionId === "doğu"
                  ? "halay rhythm with free improvisation"
                  : "traditional folk meter"
        : "free rhythm rubato";

      const tempo =
        validGenreId === "halk_turku"
          ? validRegionId === "karadeniz"
            ? "140 BPM, fast horon"
            : validRegionId === "ege"
              ? "85 BPM, heavy zeybek"
              : "70 BPM, slow rubato"
          : validGenreId === "ilahi_sufi"
            ? "75 BPM, contemplative"
            : "85 BPM, ottoman classical";

      // Western anchor — Suno'nun gerçekten anladığı dil
      const westernAnchor =
        validGenreId === "halk_turku"
          ? "Greek rebetiko meets Balkan folk ballad, Celtic mountain folk vibe"
          : validGenreId === "ilahi_sufi"
            ? "Sufi devotional meditative, Gregorian-like sustained"
            : "Persian classical, refined Ottoman maqam";

      const instruments =
        validGenreId === "halk_turku"
          ? "solo saz (bağlama Turkish lute), kaval flute, sparse acoustic, no electronic"
          : validGenreId === "ilahi_sufi"
            ? "ney flute, kanun, daf frame drum, no rhythm section"
            : "ud, kanun, kemençe, classical strings";

      const vocalCue =
        validGenreId === "halk_turku"
          ? "powerful melismatic male vocal with çatlatma cracks, traditional Anatolian folk ornamentation, uzun nağme phrasing, raw emotional"
          : validGenreId === "ilahi_sufi"
            ? "devotional melismatic vocals, deep meditative phrasing, sustained notes, breathing pauses"
            : "classical Ottoman melismatic vocals, refined ornamentation, breathy emotional control";

      // Suno docs: lyrics başında bracketed directive bloğu çok güçlü
      folkPerformanceHeader =
        `[Genre: Turkish ${validGenreId === "halk_turku" ? "Anatolian folk türkü" : validGenreId === "ilahi_sufi" ? "Sufi ilahi devotional" : "classical TSM"}]\n` +
        `[Style: ${westernAnchor}]\n` +
        `[Instruments: ${instruments}]\n` +
        `[Vocals: ${vocalCue}]\n` +
        `[Tempo: ${tempo}, ${regionRhythmHint}]\n` +
        `[Mood: ${moodCue}]\n\n`;

      // Style addon — sanitize 180'e kırpınca KRİTİK cue korunsun (öncelikli)
      folkStyleAddon =
        validGenreId === "halk_turku"
          ? "Anatolian Turkish folk türkü, melismatic male vocal, solo saz"
          : validGenreId === "ilahi_sufi"
            ? "Turkish Sufi ilahi devotional, ney flute, melismatic vocal"
            : "Turkish classical TSM ottoman, melismatic, ud kanun";
    }

    const hasLyrics = sunoOpt.optimizedLyrics.trim().length > 0;
    // Folk için lyrics başına zengin performance directive bloğu yerleştir.
    // Bu Suno'yu folk interpretation'a kilitliyor (pop'a kaymasın).
    const lyricsWithDirectives =
      hasLyrics && isFolk
        ? folkPerformanceHeader + sunoOpt.optimizedLyrics
        : sunoOpt.optimizedLyrics;

    // Suno limit'leri: non-custom 500 char, custom 5000 char.
    // Lyrics oluşamadıysa (Claude erişilemedi vb.) topicText prompt olur — bunu
    // kırparak 413 'Prompt too long' hatasını önle.
    const SUNO_NON_CUSTOM_LIMIT = 500;
    const SUNO_CUSTOM_LIMIT = 4500;

    const useCustomMode = hasLyrics || isInstrumental;
    const rawPrompt = isInstrumental
      ? ""
      : hasLyrics
        ? lyricsWithDirectives
        : topicText;
    const finalPrompt = useCustomMode
      ? rawPrompt.length > SUNO_CUSTOM_LIMIT
        ? rawPrompt.slice(0, SUNO_CUSTOM_LIMIT)
        : rawPrompt
      : rawPrompt.length > SUNO_NON_CUSTOM_LIMIT
        ? rawPrompt.slice(0, SUNO_NON_CUSTOM_LIMIT)
        : rawPrompt;

    // Style — folk addon ÖN PLANDA (sanitize 180'e kırpınca kritik cue korunsun)
    const finalStyle = sanitizeSunoStyle(
      [folkStyleAddon, kbStyle, sunoOpt.styleBoost].filter(Boolean).join(", "),
    );

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
    // Folk için V5/V5.5 batılı pop'a kayıyor — V4_5ALL Türk müziğinde çok daha
    // tutarlı sonuçlar veriyor. Model seçimi önceliği: kullanıcı seçimi > folk
    // kuralı > artist preset > default.
    const model =
      validatedModel ?? (isFolk ? "V4_5ALL" : artistId ? "V5" : "V4_5ALL");

    // Folk için styleWeight'i sıkı tut — Suno style'a daha bağlı kalsın,
    // weirdness'i düşür — ortodoks folk yorumlama
    const finalStyleWeight = isFolk
      ? Math.max(0.85, kbParams.styleWeight)
      : kbParams.styleWeight;
    const finalWeirdness = isFolk
      ? Math.min(0.15, kbParams.weirdnessConstraint)
      : kbParams.weirdnessConstraint;

    // Folk için negativeTags'i agresifleştir — pop/electronic kaymasını engelle
    const finalNegativeTags = isFolk
      ? `${kbNegativeTags}, pop production, electronic drums, modern beat, club music, EDM, trap, autotune, synth pad`
          .split(",")
          .map((s) => s.trim())
          .filter((s, i, a) => s && a.indexOf(s) === i)
          .join(", ")
          .slice(0, 180)
      : kbNegativeTags;

    const callBackUrl = getCallbackUrl(request);

    const payload: Record<string, unknown> = {
      customMode: useCustomMode,
      instrumental: isInstrumental,
      model,
      prompt: finalPrompt,
      callBackUrl,
      negativeTags: finalNegativeTags,
      styleWeight: finalStyleWeight,
      weirdnessConstraint: finalWeirdness,
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
        negativeTagsLen: kbNegativeTags.length,
        hasLyrics,
        useCustomMode,
        // İlk 80 karakter — sade ve net olmasını doğrulamak için
        stylePreview: finalStyle.slice(0, 80),
        negPreview: kbNegativeTags.slice(0, 80),
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
