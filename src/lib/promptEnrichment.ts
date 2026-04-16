/**
 * Türkçe Müzik Prompt Enrichment Katmanı
 *
 * Kullanıcının naif Türkçe girdisini Suno modelinin daha iyi anlayacağı
 * zenginleştirilmiş İngilizce prompt'a çevirir. Türk müziği tarzları için
 * enstrüman, ritim, ruh hali ve yapı detayları ekler.
 */

export type TurkishGenreId =
  | "arabesk"
  | "turku"
  | "halk"
  | "sanat"
  | "pop"
  | "rap"
  | "rock"
  | "slow"
  | "tsm"
  | "fantezi"
  | "ozgun"
  | "oyun_havasi"
  | "ilahi"
  | "uzun_hava";

export interface GenrePreset {
  id: TurkishGenreId;
  displayName: string;
  englishPrompt: string;
  instruments: string[];
  vocalStyle: string;
  rhythm?: string;
  mood: string[];
  defaultBpm: [number, number];
}

/**
 * Türk müziği preset kütüphanesi.
 * Her preset, Suno için zenginleştirilmiş İngilizce prompt bileşenleri içerir.
 */
export const TURKISH_GENRE_PRESETS: Record<TurkishGenreId, GenrePreset> = {
  arabesk: {
    id: "arabesk",
    displayName: "Arabesk",
    englishPrompt:
      "Turkish arabesque, emotional minor-key ballad, dramatic strings",
    instruments: [
      "bağlama",
      "electric saz",
      "string orchestra",
      "darbuka",
      "def",
      "synth pad",
    ],
    vocalStyle:
      "passionate male vocal with heavy melisma and gırtlak ornamentation",
    rhythm: "4/4 slow to mid-tempo",
    mood: ["melancholic", "yearning", "heartbroken", "dramatic"],
    defaultBpm: [70, 95],
  },
  turku: {
    id: "turku",
    displayName: "Türkü",
    englishPrompt: "Anatolian folk song, raw authentic traditional arrangement",
    instruments: ["bağlama", "kaval", "davul", "zurna", "acoustic ensemble"],
    vocalStyle:
      "solo vocal with traditional çatlatma ornamentation, regional Anatolian style",
    rhythm: "often aksak (9/8 or 7/8) asymmetric",
    mood: ["authentic", "earthy", "storytelling", "rural"],
    defaultBpm: [80, 120],
  },
  halk: {
    id: "halk",
    displayName: "Türk Halk Müziği",
    englishPrompt: "Turkish folk music, traditional Anatolian roots",
    instruments: ["bağlama", "saz", "kemençe", "tulum", "davul"],
    vocalStyle: "traditional folk vocal with regional accent",
    rhythm: "varied aksak patterns",
    mood: ["traditional", "cultural", "heartfelt"],
    defaultBpm: [90, 130],
  },
  sanat: {
    id: "sanat",
    displayName: "Türk Sanat Müziği",
    englishPrompt:
      "Turkish art music (TSM), classical Ottoman-rooted composition",
    instruments: ["ud", "kanun", "ney", "tanbur", "kemençe", "def"],
    vocalStyle:
      "refined classical vocal with ornate nağme, makam-based phrasing",
    rhythm: "usul patterns, often slow düyek or semai",
    mood: ["elegant", "poetic", "refined", "nostalgic"],
    defaultBpm: [60, 90],
  },
  tsm: {
    id: "tsm",
    displayName: "Klasik TSM",
    englishPrompt: "Classical Turkish art music, Ottoman court tradition",
    instruments: ["ud", "kanun", "ney", "tanbur", "kudüm"],
    vocalStyle: "classical gazel-style melismatic delivery",
    rhythm: "complex usul",
    mood: ["contemplative", "classical"],
    defaultBpm: [55, 80],
  },
  pop: {
    id: "pop",
    displayName: "Türkçe Pop",
    englishPrompt: "Turkish pop music, modern production, radio-friendly hook",
    instruments: [
      "electric guitar",
      "synth",
      "drum kit",
      "bass",
      "occasional bağlama accent",
    ],
    vocalStyle: "clean contemporary Turkish vocal, catchy melodic hooks",
    rhythm: "4/4 pop groove",
    mood: ["upbeat", "modern", "romantic", "energetic"],
    defaultBpm: [95, 130],
  },
  rap: {
    id: "rap",
    displayName: "Türkçe Rap",
    englishPrompt:
      "Turkish rap hip-hop, modern trap production, 808 bass, hi-hats",
    instruments: ["808 bass", "trap hi-hats", "dark synth pad", "snare"],
    vocalStyle: "confident Turkish rap flow with clear diction",
    rhythm: "trap beat, 140 BPM half-time feel",
    mood: ["urban", "confident", "raw", "street"],
    defaultBpm: [120, 160],
  },
  rock: {
    id: "rock",
    displayName: "Anadolu Rock",
    englishPrompt:
      "Anadolu rock, fusion of Anatolian folk with psychedelic rock",
    instruments: [
      "electric saz",
      "distorted guitar",
      "bass",
      "drum kit",
      "organ",
    ],
    vocalStyle: "powerful Turkish vocal with folk inflection",
    rhythm: "rock backbeat with occasional aksak sections",
    mood: ["driving", "nostalgic", "fusion"],
    defaultBpm: [100, 140],
  },
  slow: {
    id: "slow",
    displayName: "Slow / Ballad",
    englishPrompt: "Turkish slow ballad, emotional intimate arrangement",
    instruments: ["piano", "strings", "acoustic guitar", "soft drums"],
    vocalStyle: "intimate emotional Turkish vocal, dynamic delivery",
    rhythm: "slow 6/8 or 4/4",
    mood: ["romantic", "emotional", "tender", "heartfelt"],
    defaultBpm: [60, 85],
  },
  fantezi: {
    id: "fantezi",
    displayName: "Fantezi",
    englishPrompt:
      "Turkish fantezi, crossover of pop and arabesque with folk flavor",
    instruments: ["bağlama", "synth", "string section", "darbuka", "drum kit"],
    vocalStyle: "dramatic emotional vocal with light melisma",
    rhythm: "4/4 mid-tempo",
    mood: ["dramatic", "crossover", "emotional"],
    defaultBpm: [90, 115],
  },
  ozgun: {
    id: "ozgun",
    displayName: "Özgün Müzik",
    englishPrompt:
      "Turkish özgün protest folk, acoustic arrangement with poetic lyrics",
    instruments: ["acoustic guitar", "bağlama", "light percussion"],
    vocalStyle: "sincere male or female vocal, narrative delivery",
    rhythm: "acoustic folk feel",
    mood: ["poetic", "political", "contemplative"],
    defaultBpm: [75, 100],
  },
  oyun_havasi: {
    id: "oyun_havasi",
    displayName: "Oyun Havası",
    englishPrompt:
      "Turkish oyun havası dance music, festive celebratory energy",
    instruments: ["klarnet", "darbuka", "def", "bağlama", "violin"],
    vocalStyle: "often instrumental, sometimes shouted vocal interjections",
    rhythm: "9/8 aksak or 4/4 roman style",
    mood: ["festive", "energetic", "danceable", "joyful"],
    defaultBpm: [120, 160],
  },
  ilahi: {
    id: "ilahi",
    displayName: "İlahi / Sufi",
    englishPrompt: "Turkish sufi ilahi, spiritual devotional music",
    instruments: ["ney", "bendir", "def", "tanbur", "choir"],
    vocalStyle: "reverent solo or choir vocal, spiritual phrasing",
    rhythm: "slow meditative usul",
    mood: ["spiritual", "serene", "devotional", "contemplative"],
    defaultBpm: [55, 80],
  },
  uzun_hava: {
    id: "uzun_hava",
    displayName: "Uzun Hava",
    englishPrompt:
      "Turkish uzun hava, free-rhythm improvised Anatolian folk vocal",
    instruments: ["bağlama", "sparse accompaniment"],
    vocalStyle: "free-rhythm solo vocal with extended melisma, no fixed tempo",
    rhythm: "free rhythm, rubato",
    mood: ["raw", "ancient", "emotional", "meditative"],
    defaultBpm: [0, 0],
  },
};

/**
 * Türkçe kelime/tarz eşleştirmeleri — kullanıcı Türkçe tarz yazdığında
 * hangi preset'e map edileceğini belirler.
 */
const TURKISH_KEYWORD_MAP: Array<{
  keywords: string[];
  genre: TurkishGenreId;
}> = [
  { keywords: ["arabesk", "arabesque"], genre: "arabesk" },
  { keywords: ["türkü", "turku"], genre: "turku" },
  { keywords: ["halk müziği", "halk muzigi"], genre: "halk" },
  {
    keywords: ["sanat müziği", "sanat muzigi", "tsm"],
    genre: "sanat",
  },
  { keywords: ["klasik türk", "klasik turk"], genre: "tsm" },
  { keywords: ["pop"], genre: "pop" },
  { keywords: ["rap", "hip hop", "hiphop"], genre: "rap" },
  { keywords: ["rock", "anadolu rock"], genre: "rock" },
  { keywords: ["slow", "balad", "ballad"], genre: "slow" },
  { keywords: ["fantezi"], genre: "fantezi" },
  { keywords: ["özgün", "ozgun", "protest"], genre: "ozgun" },
  {
    keywords: ["oyun havası", "oyun havasi", "dans"],
    genre: "oyun_havasi",
  },
  { keywords: ["ilahi", "sufi", "tasavvuf"], genre: "ilahi" },
  { keywords: ["uzun hava", "bozlak"], genre: "uzun_hava" },
];

/**
 * Türkçe mood/ruh hali kelimeleri → İngilizce karşılıkları.
 */
const MOOD_MAP: Record<string, string> = {
  hüzünlü: "melancholic, sorrowful",
  huzunlu: "melancholic, sorrowful",
  mutlu: "joyful, upbeat",
  aşk: "romantic, tender",
  ask: "romantic, tender",
  kırık: "heartbroken, wounded",
  kirik: "heartbroken, wounded",
  nostaljik: "nostalgic, bittersweet",
  enerjik: "energetic, driving",
  sakin: "calm, serene",
  karanlık: "dark, ominous",
  karanlik: "dark, ominous",
  özlem: "yearning, longing",
  ozlem: "yearning, longing",
  öfkeli: "angry, intense",
  ofkeli: "angry, intense",
  umutlu: "hopeful, uplifting",
};

/**
 * Kullanıcı metninde Türkçe tarz/mood tespit eder.
 */
function detectGenre(text: string): TurkishGenreId | null {
  const normalized = text.toLowerCase();
  for (const { keywords, genre } of TURKISH_KEYWORD_MAP) {
    if (keywords.some((k) => normalized.includes(k))) {
      return genre;
    }
  }
  return null;
}

function detectMoods(text: string): string[] {
  const normalized = text.toLowerCase();
  const found: string[] = [];
  for (const [tr, en] of Object.entries(MOOD_MAP)) {
    if (normalized.includes(tr)) found.push(en);
  }
  return found;
}

/**
 * Kullanıcı metni Türkçe mi? Basit heuristik: Türkçe'ye özgü karakterler
 * veya yaygın kelimeler.
 */
function isTurkish(text: string): boolean {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return true;
  const commonTrWords =
    /\b(ve|bir|ile|için|gibi|çok|şarkı|müzik|aşk|sevgi|hüzün|güzel)\b/i;
  return commonTrWords.test(text);
}

export interface EnrichmentInput {
  userPrompt: string;
  userStyle?: string;
  instrumental?: boolean;
  explicitGenre?: TurkishGenreId;
}

export interface EnrichmentOutput {
  enrichedPrompt: string;
  enrichedStyle: string;
  detectedGenre: TurkishGenreId | null;
  detectedMoods: string[];
  isTurkishContent: boolean;
  qualityMarkers: string;
}

const BASE_QUALITY_MARKERS =
  "natural authentic vocals, real organic instruments, genuine emotional delivery, warm analog tone, not autotuned, not synthetic, professional studio production";

const TURKISH_QUALITY_MARKERS =
  "authentic Turkish pronunciation with proper diacritics, natural Turkish vocal delivery without Anglo accent, clear Turkish diction";

/**
 * Ana enrichment fonksiyonu.
 * Türkçe ve Türk müziği için zenginleştirilmiş prompt üretir.
 */
export function enrichPrompt(input: EnrichmentInput): EnrichmentOutput {
  const { userPrompt, userStyle, instrumental = false, explicitGenre } = input;
  const combined = `${userPrompt} ${userStyle ?? ""}`.trim();

  const isTurkishContent = isTurkish(combined);
  const detectedGenre = explicitGenre ?? detectGenre(combined);
  const detectedMoods = detectMoods(combined);
  const preset = detectedGenre ? TURKISH_GENRE_PRESETS[detectedGenre] : null;

  const styleParts: string[] = [];
  const promptParts: string[] = [userPrompt];

  if (preset) {
    styleParts.push(preset.englishPrompt);
    styleParts.push(
      `instruments: ${preset.instruments.slice(0, 5).join(", ")}`,
    );
    if (!instrumental) {
      styleParts.push(preset.vocalStyle);
    }
    if (preset.rhythm) styleParts.push(preset.rhythm);
    const [minBpm, maxBpm] = preset.defaultBpm;
    if (minBpm > 0) styleParts.push(`${minBpm}-${maxBpm} BPM`);
  }

  if (detectedMoods.length > 0) {
    styleParts.push(detectedMoods.join(", "));
  } else if (preset) {
    styleParts.push(preset.mood.slice(0, 2).join(", "));
  }

  const qualityMarkers = [
    BASE_QUALITY_MARKERS,
    isTurkishContent && !instrumental ? TURKISH_QUALITY_MARKERS : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (userStyle) styleParts.unshift(userStyle);

  const enrichedStyle = styleParts.filter(Boolean).join(", ");
  const enrichedPrompt = promptParts.join(" ").trim();

  return {
    enrichedPrompt,
    enrichedStyle,
    detectedGenre,
    detectedMoods,
    isTurkishContent,
    qualityMarkers,
  };
}

/**
 * Custom olmayan (simple) mode için: prompt + quality suffix birleştirme.
 * Mevcut generate/route.ts davranışının drop-in yerine geçer.
 */
export function buildSimpleModePrompt(
  userPrompt: string,
  instrumental: boolean,
): string {
  const enriched = enrichPrompt({ userPrompt, instrumental });
  const genreTag = enriched.detectedGenre
    ? `[${TURKISH_GENRE_PRESETS[enriched.detectedGenre].englishPrompt}] `
    : "";
  const suffix = instrumental ? "" : `, ${enriched.qualityMarkers}`;
  return `${genreTag}${userPrompt}${suffix}`.trim();
}

/**
 * Custom mode için: ayrı prompt ve style alanlarını zenginleştirir.
 */
export function buildCustomModePayload(input: {
  prompt?: string;
  style?: string;
  instrumental?: boolean;
  explicitGenre?: TurkishGenreId;
}): { prompt?: string; style?: string; debug: EnrichmentOutput } {
  const enriched = enrichPrompt({
    userPrompt: input.prompt ?? "",
    userStyle: input.style,
    instrumental: input.instrumental,
    explicitGenre: input.explicitGenre,
  });

  return {
    prompt: input.prompt,
    style: enriched.enrichedStyle || input.style,
    debug: enriched,
  };
}
