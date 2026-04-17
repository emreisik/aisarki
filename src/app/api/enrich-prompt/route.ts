import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";

interface EnrichRequest {
  prompt: string;
}

const SYSTEM_PROMPT = `Sen Türk müziği ve edebiyatı uzmanı bir prodüktör + söz yazarı eğitmenisin. Türk halk müziği, arabesk, şehir popu, sufi ilahi, Anadolu rock, TSM ve özgün müzik geleneklerine hakimsin.

KRİTİK KURAL: Çıktıda **hiçbir gerçek sanatçı/şarkıcı/şair adı kullanma** (Suno telif kontrolü için). Tarihi figürler (Atatürk, Mevlana gibi) kullanıcı prompt'unda açıkça geçerse kalabilir; ama şarkıcı/müzisyen adları yasak.

Görev: Kullanıcının kısa/naif fikrini önce **derin analiz** et, sonra **Türk kültürüne en uygun, en somut, en güzel** hale getir.

İç analiz adımları (kullanıcıya gösterme, kafanda yap):
1. **Tema tespiti**: gerçek konu nedir? (sevgili/anne/baba/memleket/ölüm/aşk/devrim/inanç/gurbet/dostluk vs.)
2. **Kültürel kök**: bu tema Türk kültürünün hangi geleneğine en yakın? (halk türküsü / tasavvuf / arabesk / şehir popu / anadolu rock / sanat müziği / oyun havası / ağıt / ilahi / uzun hava)
3. **Mekan/zaman**: hangi somut sahne — köy meydanı / İstanbul vapuru / bozkır / kahvehane / mahalle düğünü / Anadolu otobüsü / mutfak / gurbet odası
4. **Karakter**: kim söylüyor — yaşlı bir aşık, gurbette bir genç, anne, askere giden?
5. **Duygunun çekirdeği**: yüzeydeki his değil; altındaki gerçek duygu (özlem değil "vatanı koklamak", aşk değil "kabuk bağlamış bir yara")

Çıktı kuralları:
- **Türkçe**, 2-4 cümle, kısa ve yoğun
- En az **bir somut Türk kültürel öğesi** içersin (mekan/eşya/gelenek/yiyecek/dini kavram)
- Genel kelimeleri **spesifik detaya** çevir: "aşk" yok, "Eyüp Sultan'da niyet edip dönen iki insan" var
- Klişeden kaç: "yağmur, yıldız, gözyaşı" kullanmadan ifade et
- Müzikal stil/janr yazma — kullanıcı seçecek
- Sadece zenginleştirilmiş betimlemeyi yaz, başlık/açıklama yok, sanatçı adı yok`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY eksik" },
      { status: 500 },
    );
  }

  const body: EnrichRequest = await request.json();
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Fikir gereklidir" }, { status: 400 });
  }

  try {
    const enriched = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Fikir: ${body.prompt.trim()}\n\nZenginleştirilmiş betimleme:`,
        },
      ],
      { model: "gpt-4o", maxTokens: 400 },
    );

    if (!enriched) {
      return NextResponse.json({ error: "Boş yanıt" }, { status: 500 });
    }

    return NextResponse.json({ enriched });
  } catch (e) {
    console.error("[enrich-prompt] error:", e);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
