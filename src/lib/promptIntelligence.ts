/**
 * Prompt Intelligence — Claude ile kullanıcı fikrini analiz edip
 * yapılandırılmış metadata üretir. Bu metadata, turkishMusicKB ile
 * birleştirilerek tüm Suno API parametrelerinin otomatik kurulmasını sağlar.
 *
 * ⚠️ KRİTİK: Analiz çıktısında ve system prompt örneklerinde **hiçbir sanatçı
 * adı yer almaz**. Sadece stil preset ID'leri (agir_arabesk, sehirli_pop vb.)
 * kullanılır. Bu Suno API telif filtrelerine takılmamak için zorunlu.
 */

import {
  ARTIST_PRESETS,
  GENRES,
  MAKAMS,
  REGIONS,
  ArtistPresetId,
  GenreId,
  MakamId,
  RegionId,
} from "./turkishMusicKB";
import type { PromptAnalysis } from "@/types";

import { chatCompletion } from "./openai";

const ARTIST_IDS = Object.keys(ARTIST_PRESETS) as ArtistPresetId[];
const GENRE_IDS = Object.keys(GENRES) as GenreId[];
const REGION_IDS = Object.keys(REGIONS) as RegionId[];
const MAKAM_IDS = Object.keys(MAKAMS) as MakamId[];

const SYSTEM_PROMPT = `Sen bir Türk müziği ve kültürü uzmanı analiz motorusun. Kullanıcının verdiği kısa şarkı fikrini derinlemesine analiz eder ve **strict JSON** olarak yapılandırılmış metadata döndürürsün.

⚠️ KRİTİK KURAL: Çıktıda veya "summary" alanında **hiçbir gerçek sanatçı/şarkıcı/müzisyen adı kullanma** (Suno telif filtresi için). Sadece stil karakteristiklerini tarif et: "ağır arabesk", "şehirli pop", "bozkır türküsü" gibi. Herhangi bir Türk veya yabancı müzisyen ismi yazma.

GÖREV: Verilen fikri 5 boyutta analiz et:
1. **Tema** — gerçek konu (anne/sevgili/memleket/asker/gurbet/inanç vb.)
2. **Kültürel kök** — hangi Türk müzik geleneği en uygun (arabesk/türkü/sanat/pop/rock/sufi)
3. **Mekan/zaman** — somut sahne (köy, vapur, gurbet, Anıtkabir vb.)
4. **Karakter** — kim söylüyor, kim hakkında
5. **Duygu çekirdeği** — yüzeydeki his değil, alttaki gerçek duygu

ÇIKTI: SADECE JSON. Açıklama, markdown, code block kullanma. Şema:

{
  "theme": "string — kısa tema özeti, max 80 karakter",
  "emotion": ["string"] — 2-4 duygu etiketi (Türkçe),
  "era": "modern" | "vintage" | "ottoman" | "mixed",
  "genrePrimary": "${GENRE_IDS.join('" | "')}",
  "genreSecondary": "${GENRE_IDS.join('" | "')}" | null,
  "region": "${REGION_IDS.join('" | "')}" | null,
  "characterPerspective": "string — örn 'yetişkin çocuk → anne'",
  "vocalGender": "m" | "f",
  "suggestedArtist": "${ARTIST_IDS.join('" | "')}" | null,
  "bpm": [number, number] — örn [75, 95],
  "makamHint": "${MAKAM_IDS.join('" | "')}" | null,
  "culturalDetails": ["string"] — 3-5 somut Türk kültürel detay (mekan/eşya/gelenek/yiyecek),
  "summary": "string — 1 cümle, kullanıcıya gösterilecek özet, SANATÇI ADI YASAK. Stil tarif et: 'ağır arabesk, erkek vokal, dramatik string'"
}

KURALLAR:
- Sadece JSON döndür, başına/sonuna metin koyma
- Verilen enum'lardan birini seç (özgürce uydurmas)
- region ve makamHint emin değilsen null bırak
- suggestedArtist 12 stil preset'inden birini seç (ID olarak); yoksa null
- vocalGender mantıklı seç: anne/sevgili kız → genelde m vokal, sevgili erkek → f vokal
- **summary'de gerçek sanatçı adı yasak** — sadece stil karakteristiği ("sıcak şehir popu", "ağır arabesk") tarif et

ÖRNEKLER:

Girdi: "anneme doğum günü"
{
  "theme": "anneye şükran ve doğum günü kutlaması",
  "emotion": ["şükran", "sıcaklık", "nostalji", "sevgi"],
  "era": "modern",
  "genrePrimary": "sehir_pop",
  "genreSecondary": "ozgun",
  "region": null,
  "characterPerspective": "yetişkin çocuk → anne",
  "vocalGender": "f",
  "suggestedArtist": "sehirli_pop",
  "bpm": [75, 95],
  "makamHint": "nihavend",
  "culturalDetails": ["mutfak çay kokusu", "dikiş makinesi", "anne dua", "ev sıcaklığı", "el emeği"],
  "summary": "Sıcak şehirli pop tarzı, kadın vokal, anne için nostalji ve şükran"
}

Girdi: "Karadenizli oğluma asker mektubu"
{
  "theme": "askere giden oğla ebeveyn mektubu",
  "emotion": ["özlem", "gurur", "endişe", "umut"],
  "era": "modern",
  "genrePrimary": "halk_turku",
  "genreSecondary": "ozgun",
  "region": "karadeniz",
  "characterPerspective": "ebeveyn → asker oğul",
  "vocalGender": "m",
  "suggestedArtist": "bozkir_turku",
  "bpm": [85, 110],
  "makamHint": "hüseyni",
  "culturalDetails": ["yayla", "kemençe sesi", "kahvehane", "askerlik tezkeresi", "fındık bahçesi"],
  "summary": "Karadeniz halk türküsü tarzı, kemençe ve davul, asker özlemi"
}

Girdi: "Mevlana hakkında"
{
  "theme": "tasavvuf yolunda kendini bulma",
  "emotion": ["huzur", "aşk-ı ilahi", "tevazu", "arayış"],
  "era": "ottoman",
  "genrePrimary": "ilahi_sufi",
  "genreSecondary": null,
  "region": null,
  "characterPerspective": "derviş ruhu → ilahi sevgili",
  "vocalGender": "m",
  "suggestedArtist": "sufi_ilahi",
  "bpm": [60, 75],
  "makamHint": "rast",
  "culturalDetails": ["Konya", "semazen dönüşü", "ney sesi", "mesnevi sayfası", "tekke"],
  "summary": "Sufi ilahi tarzı, ney ve bendir, manevi huzur atmosferi"
}

Girdi: "ayrılık acısı"
{
  "theme": "biten bir aşkın acısı ve kabulleniş",
  "emotion": ["acı", "kabulleniş", "yalnızlık"],
  "era": "vintage",
  "genrePrimary": "arabesk",
  "genreSecondary": "fantezi",
  "region": null,
  "characterPerspective": "terk edilmiş aşık",
  "vocalGender": "m",
  "suggestedArtist": "agir_arabesk",
  "bpm": [70, 85],
  "makamHint": "hicaz",
  "culturalDetails": ["meyhane", "rakı kadehi", "yağmurlu cadde", "telefon kulübesi", "duvar saati"],
  "summary": "Ağır arabesk tarzı, dramatik string, hicaz makamı, ağır acı"
}`;

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function isValidAnalysis(obj: unknown): obj is PromptAnalysis {
  if (!obj || typeof obj !== "object") return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.theme === "string" &&
    Array.isArray(a.emotion) &&
    typeof a.era === "string" &&
    typeof a.genrePrimary === "string" &&
    typeof a.characterPerspective === "string" &&
    (a.vocalGender === "m" || a.vocalGender === "f") &&
    Array.isArray(a.bpm) &&
    a.bpm.length === 2 &&
    Array.isArray(a.culturalDetails) &&
    typeof a.summary === "string"
  );
}

/**
 * Kullanıcı prompt'unu Claude ile analiz et.
 * Hata durumunda null döner — caller fallback olarak default değerler kullanmalı.
 */
export async function analyzePrompt(
  userPrompt: string,
): Promise<PromptAnalysis | null> {
  if (!process.env.OPENAI_API_KEY || !userPrompt.trim()) return null;

  try {
    const text = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Fikir: ${userPrompt.trim()}\n\nJSON analiz:`,
        },
      ],
      { model: "gpt-4o-mini", maxTokens: 600, temperature: 0.3 },
    );
    if (!text) return null;
    const parsed = safeJsonParse(text);
    if (!isValidAnalysis(parsed)) {
      console.warn(
        "[promptIntelligence] geçersiz JSON şeması",
        text.slice(0, 200),
      );
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn("[promptIntelligence] hata:", e);
    return null;
  }
}

/**
 * Default analiz fallback'i — Claude erişimi yoksa veya hata olursa.
 * Generic Türkçe pop varsayımı yapar.
 */
export function defaultAnalysis(prompt: string): PromptAnalysis {
  return {
    theme: prompt.slice(0, 80),
    emotion: ["genel"],
    era: "modern",
    genrePrimary: "sehir_pop",
    characterPerspective: "anlatıcı",
    vocalGender: "m",
    bpm: [85, 110],
    culturalDetails: [],
    summary: "Genel Türkçe pop",
  };
}
