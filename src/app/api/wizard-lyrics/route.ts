import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ARTIST_PRESETS,
  GENRES,
  REGIONS,
  MAKAMS,
  type ArtistPresetId,
  type GenreId,
  type RegionId,
  type MakamId,
} from "@/lib/turkishMusicKB";
import {
  resolveArtistPreset,
  resolveMakam,
  resolveLyricsBlueprint,
  THEME_TEMPLATES,
  MOOD_EMOTION_LABELS,
  TURKISH_CLICHE_BLACKLIST,
} from "@/lib/wizardMappings";
import { chatCompletion, quickCompletion } from "@/lib/openai";
import type { WizardMoodId } from "@/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY eksik" },
      { status: 500 },
    );
  }

  try {
    const { mood, genreId, theme, themeText, regionId } = await request.json();

    if (!mood || !genreId) {
      return NextResponse.json(
        { error: "Duygu ve tarz seçimi zorunludur" },
        { status: 400 },
      );
    }

    const validGenreId = genreId in GENRES ? (genreId as GenreId) : undefined;
    const artistId = validGenreId
      ? resolveArtistPreset(mood as WizardMoodId, validGenreId)
      : undefined;
    const makamId = resolveMakam(mood as WizardMoodId);
    const validRegionId =
      regionId && regionId in REGIONS ? (regionId as RegionId) : undefined;
    const validMakamId = makamId in MAKAMS ? (makamId as MakamId) : undefined;

    const artistPreset = artistId ? ARTIST_PRESETS[artistId] : undefined;
    const regionPreset = validRegionId ? REGIONS[validRegionId] : undefined;
    const makamPreset = validMakamId ? MAKAMS[validMakamId] : undefined;
    const genrePreset = validGenreId ? GENRES[validGenreId] : undefined;

    const blueprint = validGenreId
      ? resolveLyricsBlueprint(validGenreId)
      : resolveLyricsBlueprint("sehir_pop" as GenreId);

    const themeTemplate = THEME_TEMPLATES.find((t) => t.id === theme);
    const topicText =
      themeText?.trim() ||
      themeTemplate?.contextHint ||
      "genel bir Türk şarkısı";
    const culturalDetails = themeTemplate?.culturalDetails?.join(", ") || "";
    const moodLabel = MOOD_EMOTION_LABELS[mood as WizardMoodId] || "";

    // Context
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

    const allCliches = [
      ...TURKISH_CLICHE_BLACKLIST,
      ...blueprint.clicheBlacklist,
    ];
    const clicheList = allCliches
      .slice(0, 12)
      .map((c) => `"${c}"`)
      .join(", ");

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

    const systemPrompt = `Sen dünya çapında bir Türk müzik sözü yazarısın. Her tarzda profesyonel, söylenebilir, duygusal derinliği olan sözler yazarsın.

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

═══ SUNO TÜRKÇE TELAFFUZ OPTİMİZASYON ═══

⚠️ KRİTİK — "ı" vs "i" SORUNU:
Suno, Türkçe "ı" harfini neredeyse her zaman "i" olarak söylüyor. Bu en büyük telaffuz hatası.
ÇÖZÜM STRATEJİLERİ:
- "ı" içeren kelimeleri mümkünse "ı"sız eşanlamlılarıyla değiştir:
  "kızıl" → "al", "sıcak" → "ılık" yerine "yakıcı" değil → tam tersi, "ı" azalt
  "ışık" → "aydınlık" DEĞİL (2 tane ı var) → "nur", "parıltı" DEĞİL → "ışıma" DEĞİL → "güneş", "ay"
  "yalnızlık" → "yalnızlık" kaçınılmazsa satır sonuna koy ve uzat
- "ı"yı kaçınılmaz kullanıyorsan: satır sonuna veya ölçü vurgusuna yerleştir — Suno orada daha dikkatli söyler.
- Nakarat'ta "ı" içeren kelime KULLANMA — tekrar eden hook'larda hata çarpanla büyür.
- "ı" ile "i" minimal çifti olan kelimeleri aynı şarkıda KULLANMA (kır/kir, sığ/sig, alın/alin).

DİĞER KURALLAR:
- Uzun bileşik kelimelerden KAÇIN — Suno kısa kelimeleri daha net söyler (maks 4 hece/kelime).
- "ğ" içeren kelimelerde ğ'yı kelime sonuna getirmeyi tercih et (dağ, bağ — bunlar sorunsuz).
- Nakarat'ta tek heceli hooklar: "gel", "kal", "yar", "dur", "sen", "ben".
- Her satırı 8-12 hece arasında tut.
- Ard arda ünsüz yığılması olan kelimelerden kaçın.

Sadece sözleri yaz — açıklama, başlık veya yorum ekleme.`;

    const titleSystemPrompt = `Kısa, şiirsel bir Türkçe şarkı başlığı üret. Maksimum 5 kelime. Sadece başlığı yaz, başka hiçbir şey yazma. Tırnak işareti kullanma.`;

    const [lyrics, title] = await Promise.all([
      chatCompletion(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Şarkı konusu: ${topicText}${contextBlock}\n\nŞarkı sözlerini yaz:`,
          },
        ],
        { model: "gpt-4o", maxTokens: 2048 },
      ),
      quickCompletion(
        titleSystemPrompt,
        `Duygu: ${moodLabel}\nTarz: ${genrePreset?.label || genreId}\nKonu: ${topicText}\n\nBaşlık:`,
      ),
    ]);

    const cleanTitle = title.trim().replace(/^["']|["']$/g, "");

    return NextResponse.json({ lyrics, title: cleanTitle });
  } catch (error) {
    console.error("[wizard-lyrics] error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
