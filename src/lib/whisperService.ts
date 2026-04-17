/**
 * Telaffuz Doğrulama Servisi
 *
 * Suno'dan üretilen şarkıların Türkçe telaffuz kalitesini ölçer.
 * - STT (Speech-to-Text): OpenAI Whisper
 * - Scoring: GPT-4o ile akıllı Türkçe telaffuz analizi
 *
 * Tek API key: OPENAI_API_KEY (Whisper + GPT-4o)
 */

import { chatCompletion } from "./openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

// ── Tipler ──────────────────────────────────────────────────────

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

interface PronunciationAnalysis {
  /** 0-100 arası telaffuz doğruluk skoru */
  score: number;
  /** Sorunlu kelimeler ve ne olarak duyulduğu */
  issues: Array<{
    original: string;
    heard: string;
    severity: "low" | "medium" | "high";
  }>;
  /** Bir sonraki üretim için fonetik iyileştirme önerileri */
  suggestions: string[];
}

// ── Whisper STT ─────────────────────────────────────────────────

/**
 * Bir audio URL'den şarkıyı transcribe eder.
 * OpenAI Whisper API gerektirir — Claude audio transcription yapamaz.
 */
export async function transcribeSong(
  audioUrl: string,
): Promise<TranscriptionResult | null> {
  if (!OPENAI_API_KEY) {
    console.warn(
      "[whisper] OPENAI_API_KEY tanımlı değil, transcription atlanıyor",
    );
    return null;
  }

  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      console.warn(`[whisper] Audio fetch başarısız: ${audioRes.status}`);
      return null;
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

    const formData = new FormData();
    formData.append("file", audioBlob, "song.mp3");
    formData.append("model", "gpt-4o-transcribe");
    formData.append("language", "tr");
    formData.append("response_format", "json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!res.ok) {
      console.warn(`[whisper] Transcription API hatası: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      text: data.text ?? "",
      language: data.language ?? "tr",
      duration: data.duration ?? 0,
    };
  } catch (e) {
    console.error("[whisper] Transcription hatası:", e);
    return null;
  }
}

// ── Claude ile Akıllı Türkçe Telaffuz Analizi ──────────────────

/**
 * Claude Haiku ile orijinal lyrics ve Whisper transcription'ını karşılaştırır.
 * Basit Levenshtein yerine Türkçe'ye özgü dilbilimsel analiz yapar:
 *
 * - ğ/g karışımı, ı/i karışımı gibi Türkçe'ye özgü hataları tanır
 * - Müzik bağlamını anlar (tekrar, ad-lib, vokal tag'ler normal)
 * - Sorunlu kelimelerin listesini ve severity'sini verir
 * - Bir sonraki üretim için fonetik iyileştirme önerileri sunar
 *
 * OPENAI_API_KEY yoksa basit Levenshtein fallback'e düşer.
 */
export async function scorePronunciation(
  originalLyrics: string,
  transcribedText: string,
): Promise<number> {
  // Claude varsa akıllı analiz yap
  if (OPENAI_API_KEY) {
    try {
      const analysis = await gptAnalyzePronunciation(
        originalLyrics,
        transcribedText,
      );
      if (analysis) return analysis.score;
    } catch (e) {
      console.warn(
        "[pronunciation] Claude analizi başarısız, fallback'e düşülüyor:",
        e,
      );
    }
  }

  // Fallback: basit kelime eşleştirme
  return fallbackScore(originalLyrics, transcribedText);
}

/**
 * scorePronunciation'ın detaylı versiyonu — sorunlu kelimeleri ve önerileri de döndürür.
 * Admin dashboard veya detaylı analiz için kullanılır.
 */
export async function analyzePronunciation(
  originalLyrics: string,
  transcribedText: string,
): Promise<PronunciationAnalysis> {
  if (OPENAI_API_KEY) {
    try {
      const analysis = await gptAnalyzePronunciation(
        originalLyrics,
        transcribedText,
      );
      if (analysis) return analysis;
    } catch (e) {
      console.warn("[pronunciation] Claude analizi başarısız:", e);
    }
  }

  return {
    score: fallbackScore(originalLyrics, transcribedText),
    issues: [],
    suggestions: [],
  };
}

/**
 * GPT-4o ile telaffuz analizi — tek API çağrısı ile score + issues + suggestions.
 */
async function gptAnalyzePronunciation(
  originalLyrics: string,
  transcribedText: string,
): Promise<PronunciationAnalysis | null> {
  const systemPrompt = `Sen bir Türkçe telaffuz kalite analistisin. Bir şarkının orijinal sözleri ile AI tarafından söylendikten sonra Whisper ile transcribe edilen metni karşılaştırıyorsun.

GÖREV: İki metni karşılaştır ve telaffuz doğruluğunu puanla.

KURALLAR:
- Suno vokal tag'leri ([Verse], [Chorus], [Bridge] vb.) ve ad-lib'ler normal — bunları hata sayma.
- Tekrar eden satırlar (nakarat) normaldir — her tekrarda birebir aynı olması gerekmez.
- Türkçe'ye özgü karışıklıkları özellikle kontrol et:
  * ı ↔ i karışımı (en yaygın hata)
  * ğ → g veya sessiz atlama
  * ş → s, ç → c karışımı
  * ö → o, ü → u düzleşmesi
- Kelime sırası farkı önemli değil (müzikal nedenlerle değişebilir).
- Eksik/eklenen kelimeler ciddi hata sayılır.

ÇIKTI FORMAT: Sadece JSON döndür, başka hiçbir şey yazma.
{
  "score": 0-100 arası integer,
  "issues": [{"original": "orijinal kelime", "heard": "duyulan kelime", "severity": "low|medium|high"}],
  "suggestions": ["bir sonraki üretim için öneri"]
}

PUANLAMA:
- 90-100: Mükemmel — neredeyse tüm kelimeler doğru
- 70-89: İyi — küçük telaffuz farkları var ama anlaşılır
- 50-69: Orta — belirgin hatalar var, bazı kelimeler anlaşılmıyor
- 30-49: Zayıf — ciddi telaffuz sorunları
- 0-29: Çok zayıf — sözler büyük ölçüde anlaşılmıyor`;

  try {
    const text = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `ORİJİNAL SÖZLER:\n${originalLyrics.slice(0, 2000)}\n\nWHISPER TRANSCRİPTİON (gerçekte söylenen):\n${transcribedText.slice(0, 2000)}`,
        },
      ],
      { model: "gpt-4o-mini", maxTokens: 1024, temperature: 0.2 },
    );

    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (e) {
    console.warn("[gpt-pronunciation] analiz hatası:", e);
    return null;
  }
}

// ── Fallback: Basit Kelime Eşleştirme ───────────────────────────

/**
 * Claude olmadan basit Levenshtein tabanlı scoring.
 * OPENAI_API_KEY yoksa veya Claude çağrısı başarısız olursa kullanılır.
 */
function fallbackScore(
  originalLyrics: string,
  transcribedText: string,
): number {
  const normalize = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/[.,!?;:'"…—\-–""'']/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length > 0);

  const originalWords = normalize(originalLyrics);
  const transcribedWords = normalize(transcribedText);

  if (originalWords.length === 0) return 100;
  if (transcribedWords.length === 0) return 0;

  let matchCount = 0;
  const transcribedSet = new Set(transcribedWords);

  for (const word of originalWords) {
    if (transcribedSet.has(word)) {
      matchCount++;
    } else {
      const threshold = Math.max(1, Math.floor(word.length * 0.3));
      const fuzzyMatch = transcribedWords.some(
        (tw) => levenshtein(word, tw) <= threshold,
      );
      if (fuzzyMatch) matchCount += 0.7;
    }
  }

  const score = Math.round((matchCount / originalWords.length) * 100);
  return Math.min(100, Math.max(0, score));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}
