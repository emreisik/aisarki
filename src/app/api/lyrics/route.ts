import { NextRequest, NextResponse } from "next/server";
import {
  ARTIST_PRESETS,
  REGIONS,
  MAKAMS,
  ArtistPresetId,
  RegionId,
  MakamId,
} from "@/lib/turkishMusicKB";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface LyricsRequest {
  // Bağlam
  topic: string; // "annem için doğum günü şarkısı"
  // Stil parametreleri (legacy — string label)
  region?: string;
  era?: string;
  makam?: string;
  mood?: string;
  vocal?: string;
  // Serbest notlar
  customNotes?: string;
  // ── Türk Müzik Bilgi Tabanı entegrasyonu ──
  artistId?: string; // ArtistPresetId — sanatçı tarzı (lyricsStyle KB'den çekilir)
  regionId?: string; // RegionId — yöresel ağız (lehçe dictionary KB'den)
  makamId?: string; // MakamId — makam mood KB'den
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY eksik — Railway Variables kontrol et" },
      { status: 500 },
    );
  }

  const body: LyricsRequest = await request.json();

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Konu gereklidir" }, { status: 400 });
  }

  // KB ile zenginleştir: sanatçı/yöre/makam ID'lerinden detaylı context çek
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

  const userPrompt = `Şarkı konusu: ${body.topic.trim()}${contextBlock}

Şarkı sözlerini yaz:`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[lyrics] Anthropic error:", res.status, err);
      let msg = "Sözler oluşturulamadı";
      try {
        const parsed = JSON.parse(err);
        if (parsed?.error?.message) msg = parsed.error.message;
      } catch {}
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const data = await res.json();
    const lyrics: string =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    if (!lyrics) {
      return NextResponse.json({ error: "Boş yanıt alındı" }, { status: 500 });
    }

    return NextResponse.json({ lyrics });
  } catch (e) {
    console.error("[lyrics] fetch error:", e);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
