import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface LyricsRequest {
  // Bağlam
  topic: string; // "annem için doğum günü şarkısı"
  // Stil parametreleri
  region?: string;
  era?: string;
  makam?: string;
  mood?: string;
  vocal?: string;
  // Serbest notlar
  customNotes?: string;
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY tanımlı değil" },
      { status: 500 },
    );
  }

  const body: LyricsRequest = await request.json();

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Konu gereklidir" }, { status: 400 });
  }

  const contextLines: string[] = [];
  if (body.region) contextLines.push(`Yöre: ${body.region}`);
  if (body.era) contextLines.push(`Dönem: ${body.era}`);
  if (body.makam) contextLines.push(`Makam: ${body.makam}`);
  if (body.mood) contextLines.push(`Duygu: ${body.mood}`);
  if (body.vocal) contextLines.push(`Vokal: ${body.vocal}`);
  if (body.customNotes) contextLines.push(`Ek notlar: ${body.customNotes}`);

  const contextBlock =
    contextLines.length > 0
      ? `\nMüzikal bağlam:\n${contextLines.join("\n")}`
      : "";

  const systemPrompt = `Sen profesyonel bir Türk müzik sözü yazarısın. Verilen bağlama ve müzikal stile uygun, gerçek duygusal derinliği olan şarkı sözleri yazarsın.

Kurallar:
- Sözler tamamen Türkçe olmalı
- Suno AI formatında yaz: [Verse 1], [Chorus], [Verse 2], [Bridge] gibi bölüm etiketleri kullan
- Her bölüm 4-6 satır olsun
- Kafiye ve ritim önemli — şarkı söylenebilir olmalı
- Yöre ve dönem belirtildiyse o dile, ağza, duygu dünyasına uy (Karadeniz ağzı, arabesk dili vs.)
- Makam belirtildiyse o makamın duygusal ağırlığını yansıt
- Klişeden kaçın, özgün imgeler kullan
- Sadece sözleri yaz, açıklama ekleme`;

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
      console.error("[lyrics] Anthropic error:", err);
      return NextResponse.json(
        { error: "Sözler oluşturulamadı" },
        { status: 500 },
      );
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
