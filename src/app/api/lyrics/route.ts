import { NextRequest, NextResponse } from "next/server";
import {
  ARTIST_PRESETS,
  REGIONS,
  MAKAMS,
  ArtistPresetId,
  RegionId,
  MakamId,
} from "@/lib/turkishMusicKB";
import { chatCompletion } from "@/lib/openai";

interface LyricsRequest {
  topic: string;
  region?: string;
  era?: string;
  makam?: string;
  mood?: string;
  vocal?: string;
  customNotes?: string;
  artistId?: string;
  regionId?: string;
  makamId?: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY eksik" },
      { status: 500 },
    );
  }

  const body: LyricsRequest = await request.json();

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Konu gereklidir" }, { status: 400 });
  }

  if (body.topic.length > 2000 || (body.customNotes?.length ?? 0) > 2000) {
    return NextResponse.json(
      { error: "Konu veya notlar çok uzun (max 2000 karakter)" },
      { status: 400 },
    );
  }

  const artist =
    body.artistId && body.artistId in ARTIST_PRESETS
      ? ARTIST_PRESETS[body.artistId as ArtistPresetId]
      : undefined;
  const region =
    body.regionId && body.regionId in REGIONS
      ? REGIONS[body.regionId as RegionId]
      : undefined;
  const makam =
    body.makamId && body.makamId in MAKAMS
      ? MAKAMS[body.makamId as MakamId]
      : undefined;

  const contextLines: string[] = [];
  if (artist) {
    contextLines.push(`Sanatçı tarzı: ${artist.label}`);
    contextLines.push(`Tarz açıklaması: ${artist.lyricsStyle}`);
  }
  if (region) {
    contextLines.push(`Yöre: ${region.label}`);
    contextLines.push(
      `Yöresel temalar (kullan): ${region.lyricsThemes.join(", ")}`,
    );
    if (Object.keys(region.lyricsLehce).length > 0) {
      const lehceList = Object.entries(region.lyricsLehce)
        .map(([tr, lehce]) => `"${tr}" → "${lehce}"`)
        .join(", ");
      contextLines.push(
        `Yöresel ağız (uygula): ${lehceList}. Bu kelimeler geçerse bu şekilde yaz.`,
      );
    }
  } else if (body.region) {
    contextLines.push(`Yöre: ${body.region}`);
  }
  if (makam) {
    contextLines.push(
      `Makam: ${makam.label} — ${makam.mood}. Bu makamın duygusal ağırlığını yansıt.`,
    );
  } else if (body.makam) {
    contextLines.push(`Makam: ${body.makam}`);
  }
  if (body.era) contextLines.push(`Dönem: ${body.era}`);
  if (body.mood) contextLines.push(`Duygu: ${body.mood}`);
  if (body.vocal) contextLines.push(`Vokal: ${body.vocal}`);
  if (body.customNotes) contextLines.push(`Ek notlar: ${body.customNotes}`);

  const contextBlock =
    contextLines.length > 0
      ? `\nMüzikal bağlam:\n${contextLines.join("\n")}`
      : "";

  const systemPrompt = `Sen profesyonel bir Türk müzik sözü yazarısın. Arabesk, halk türküsü, şehir popu, TSM, sufi ilahi, Anadolu rock, fantezi ve özgün müzik gibi Türk müzik geleneklerinin tümüne hakimsin. Verilen bağlama ve müzikal stile **birebir uygun**, gerçek duygusal derinliği olan şarkı sözleri yazarsın.

KRİTİK KURAL: Sözlerde veya herhangi bir yerde **gerçek sanatçı/şarkıcı adı geçmesin** (Suno telif kontrolü için). Stil karakteristiklerini tarif et, isim kullanma.

Kurallar:
- Sözler tamamen Türkçe olmalı
- Şarkı formatında yaz: [Intro] [Verse 1] [Chorus] [Verse 2] [Bridge] [Outro] gibi bölüm etiketleri kullan (köşeli parantez içinde, İngilizce)
- Her bölüm 4-6 satır olsun
- Kafiye ve ritim önemli — şarkı söylenebilir olmalı
- **Stil tarzı verildiyse**: o stilin dilini, kelime tercihini, duygu yaklaşımını yansıt (sanatçı adı kullanmadan)
- **Yöre verildiyse**: yöresel kelimeleri kullan, yöresel temaları (yayla, kemençe, fındık, deniz vb.) öre
- **Yöresel ağız sözlüğü verildiyse**: o kelimeleri tam belirtildiği şekilde yaz (örn "yapayrum")
- **Makam verildiyse**: o makamın duygusal ağırlığını yansıt
- Klişeden kaçın: "yağmur, yıldız, gözyaşı" yerine somut Türk kültürel imgeler kullan
- Türkçe diyakritikleri eksiksiz kullan (ç, ğ, ı, ö, ş, ü)
- Sadece sözleri yaz, açıklama veya başlık ekleme`;

  const userPrompt = `Şarkı konusu: ${body.topic.trim()}${contextBlock}\n\nŞarkı sözlerini yaz:`;

  try {
    const lyrics = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o", maxTokens: 1024 },
    );

    if (!lyrics) {
      return NextResponse.json({ error: "Boş yanıt alındı" }, { status: 500 });
    }

    return NextResponse.json({ lyrics });
  } catch (e) {
    console.error("[lyrics] error:", e);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
