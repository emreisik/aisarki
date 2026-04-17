/**
 * Suno Türk Müziği Çeviri Katmanı
 *
 * Suno Batılı bir model — Türk müzik kavramlarını doğrudan anlamaz.
 * Bu modül, Türk müzik terimlerini Suno'nun en iyi üretim yapacağı
 * İngilizce karşılıklara çevirir. Wizard seçimlerine göre otomatik
 * uygulanır — kullanıcı hiçbir şey bilmek zorunda değildir.
 *
 * 3 katman:
 * 1. Telaffuz Düzeltme — Türkçe sözlerdeki problematik karakterleri düzelt
 * 2. Bölgesel Tavır Anchor — Her bölge için Suno'nun anlayacağı Batı referansları
 * 3. Enstrüman & Ritim Optimizasyonu — Suno-optimize terimler
 */

import type { RegionId, MakamId, GenreId } from "@/lib/turkishMusicKB";

// ── 1. Telaffuz Düzeltme Sistemi ──────────────────────────────────────────

/**
 * Suno'nun Türkçe telaffuzda zorluk çektiği bilinen kelimeler.
 * Fonetik alternatifler Suno'nun seslendirme motorunun daha doğru
 * yorumlamasını sağlar.
 *
 * Kurallar:
 * - ğ → kaldır veya önceki sesliyi uzat (dağ → daa, değil → deyil)
 * - Zor kelimeler → hece ayırma ile yaz (güzelim → gü-ze-lim)
 * - Bu sözlük kümülatif büyür — yeni sorunlu kelimeler eklenir
 */
const PRONUNCIATION_FIXES: Record<string, string> = {
  // ğ düzeltmeleri — Suno ğ'yi genelde yutuyor
  dağ: "daa",
  dağlar: "daalar",
  dağların: "daaların",
  bağ: "baa",
  bağlama: "bağlama", // bu enstrüman adı, Suno bunu tanıyor
  doğa: "doa",
  doğan: "doan",
  soğuk: "souk",
  yoğun: "youn",
  değil: "deyil",
  değer: "deyer",
  öğle: "öle",
  düğün: "düün",
  düğüm: "düüm",
  boğaz: "boaz",
  uğur: "uur",
  // Sonu -ığ, -iğ, -uğ, -üğ olan heceler
  sevdiğim: "sevdiim",
  bildiğim: "bildiim",
  geldiğinde: "geldiinde",
  olduğun: "olduun",
  gördüğüm: "gördüüm",
};

/**
 * Türkçe sözlere telaffuz düzeltmesi uygula.
 * Bilinen sorunlu kelimeleri fonetik alternatifleriyle değiştirir.
 * Ayrıca uzun/karmaşık kelimeleri hece ayırmayla kolaylaştırır.
 */
export function applyPronunciationFixes(lyrics: string): string {
  let result = lyrics;

  // Bilinen sorunlu kelimeleri düzelt
  for (const [original, fixed] of Object.entries(PRONUNCIATION_FIXES)) {
    const regex = new RegExp(`\\b${original}\\b`, "gi");
    result = result.replace(regex, fixed);
  }

  return result;
}

// ── 2. Bölgesel Tavır Anchor Sistemi ──────────────────────────────────────

/**
 * Her bölge için Suno'nun anlayacağı Batı müzik referansları.
 * Suno "Karadeniz tavırı" anlamaz ama "Celtic folk energy with fiddle-driven dance"
 * dediğimizde benzer bir enerji üretir.
 *
 * Her bölge için:
 * - westernAnchor: Suno'nun eğitim verisinde bildiği Batı türleri
 * - performanceStyle: Tavır açıklaması (İngilizce)
 * - rhythmHint: Usul/ritim açıklaması
 * - sunoInstruments: Suno'nun tanıdığı enstrüman isimleri (max 3-4)
 * - vocalStyle: Vokal tekniği açıklaması
 */
export interface RegionalSunoProfile {
  westernAnchor: string;
  performanceStyle: string;
  rhythmHint: string;
  sunoInstruments: string[];
  vocalStyle: string;
}

export const REGIONAL_SUNO_PROFILES: Record<RegionId, RegionalSunoProfile> = {
  karadeniz: {
    westernAnchor:
      "Celtic/Irish folk energy, fiddle-driven fast dance, Balkan folk rhythmic intensity",
    performanceStyle:
      "agile energetic bowing, rapid ornamental trills, communal dance energy, horon circle dance feel",
    rhythmHint:
      "7/8 time signature, additive rhythm 2+2+3, fast compound meter, 140-160 BPM",
    sunoInstruments: ["kemençe", "tulum", "davul"],
    vocalStyle:
      "nasal resonant male vocals, shouted interjections, communal singing, high energy",
  },
  ege: {
    westernAnchor:
      "Mediterranean acoustic folk, Greek folk dance, contemplative Balkan ballad",
    performanceStyle:
      "deliberate weighted movements, zeybek dance gravity, proud and slow, expansive melodic phrases",
    rhythmHint:
      "9/8 time signature, additive rhythm 2+2+2+3, slow heavy meter, zeibékiko feel, 80-100 BPM",
    sunoInstruments: ["bağlama", "klarnet", "darbuka"],
    vocalStyle:
      "storytelling male vocals, controlled vibrato, proud and measured delivery",
  },
  doğu: {
    westernAnchor:
      "Middle Eastern folk ballad, Armenian duduk atmosphere, Kurdish mountain folk",
    performanceStyle:
      "uzun hava free rhythm sections, melismatic vocal runs, raw emotional outpouring, halay line dance",
    rhythmHint:
      "mixed meter, free rhythm uzun hava passages alternating with 4/4 halay, 100-130 BPM for halay",
    sunoInstruments: ["bağlama", "mey", "davul", "zurna"],
    vocalStyle:
      "powerful emotional male vocals with extended melisma, raw cry-like delivery, controlled breaks",
  },
  ic_anadolu: {
    westernAnchor:
      "Sparse desert folk, minimalist acoustic ballad, Central Asian steppe music influence",
    performanceStyle:
      "bozlak free rhythm rubato, stark and dry, solo performer intimacy, minstrel tradition",
    rhythmHint: "free rhythm rubato passages, 10/8 meter, sparse timing",
    sunoInstruments: ["bağlama", "kaval"],
    vocalStyle:
      "solo male vocal with çatlama breaks, raw emotional delivery, dry intimate production, no reverb",
  },
  trakya: {
    westernAnchor:
      "Balkan brass band, Romani jazz swing, festive Eastern European dance",
    performanceStyle:
      "Roman havası festive energy, syncopated dance grooves, wedding celebration atmosphere",
    rhythmHint:
      "9/8 aksak rhythm, Romani swing feel, fast syncopated, 130-150 BPM",
    sunoInstruments: ["klarnet", "darbuka", "def"],
    vocalStyle:
      "celebratory shouted vocals, call and response, energetic party singing",
  },
  akdeniz: {
    westernAnchor:
      "Mediterranean coastal folk, Greek island music, warm acoustic seaside",
    performanceStyle:
      "relaxed coastal feel, Yörük nomadic tradition, warm and sunny atmosphere",
    rhythmHint: "4/4 or 5/8 meter, moderate tempo, 90-110 BPM",
    sunoInstruments: ["bağlama", "darbuka"],
    vocalStyle: "warm male vocals, relaxed delivery, Mediterranean vocal color",
  },
  guneydogu: {
    westernAnchor:
      "Middle Eastern classical, Arabic maqam tradition, Mesopotamian folk",
    performanceStyle:
      "uzun hava long free-rhythm passages, Urfa sıra gecesi intimate atmosphere, dramatic emotional storytelling",
    rhythmHint:
      "free rhythm uzun hava, aksak halay sections, mixed meter, 90-120 BPM",
    sunoInstruments: ["ud", "bağlama", "mey", "tef"],
    vocalStyle:
      "powerful male vocals with deep melisma, Maqam-based melodic runs, passionate dramatic delivery",
  },
  marmara: {
    westernAnchor:
      "Sophisticated urban pop ballad, European chanson, cosmopolitan jazz-influenced",
    performanceStyle:
      "polished Istanbul production, urban sophistication, cinematic quality, elegant arrangements",
    rhythmHint: "4/4 or 6/8 ballad feel, 85-110 BPM",
    sunoInstruments: ["piano", "ud", "string ensemble"],
    vocalStyle:
      "polished emotional vocals, controlled dynamics, sophisticated urban delivery, intimate microphone technique",
  },
};

// ── 3. Makam → Suno Scale Çevirisi ────────────────────────────────────────

/**
 * Suno gerçek mikrotonal makam yapamaz (12 tonlu Batı sistemi).
 * Ama Batı scale karşılıklarını belirtirsek en yakın sonucu alırız.
 * Bu veriler mevcut MAKAMS.sunoHint'i GÜÇLENDİRİR — yerini almaz.
 */
export const MAKAM_SUNO_BOOST: Record<
  MakamId,
  { scaleHint: string; moodBoost: string }
> = {
  uşşak: {
    scaleHint: "Dorian-Phrygian modal scale, natural minor with warm 2nd",
    moodBoost: "warm introspective longing, folk narrative",
  },
  hicaz: {
    scaleHint:
      "Phrygian dominant scale, harmonic minor 5th mode, augmented 2nd interval",
    moodBoost: "deep yearning, exotic dramatic, Middle Eastern passion",
  },
  hicazkar: {
    scaleHint: "C minor with raised 4th, chromatic Ottoman classical color",
    moodBoost: "elegant melancholy, refined classical sorrow",
  },
  hüseyni: {
    scaleHint: "Dorian mode, natural folk scale, Anatolian pastoral",
    moodBoost: "warm folk narrative, countryside warmth, storytelling",
  },
  kürdi: {
    scaleHint: "Phrygian mode, dark natural minor, modal contemplation",
    moodBoost: "calm dark contemplation, philosophical depth",
  },
  nihavend: {
    scaleHint: "harmonic minor scale, Western minor, romantic",
    moodBoost: "romantic melancholy, urban love, sophisticated sadness",
  },
  rast: {
    scaleHint:
      "major scale with neutral 7th, bright Maqam Rast, near-major Middle Eastern",
    moodBoost: "stately dignified, peaceful brightness, ceremonial",
  },
  segah: {
    scaleHint: "microtonal Bb modal, contemplative spiritual scale",
    moodBoost: "deep spiritual contemplation, Sufi peace, resolution",
  },
  saba: {
    scaleHint: "D minor with diminished 4th, sorrowful religious scale",
    moodBoost: "deep sorrow, religious devotion, lament",
  },
  muhayyer: {
    scaleHint: "high register A minor, soaring modal scale",
    moodBoost: "high soaring lament, emotional peak, mountainous",
  },
  neva: {
    scaleHint: "D mixolydian-like modal, balanced Middle Eastern",
    moodBoost: "balanced clarity, modal equilibrium",
  },
  buselik: {
    scaleHint: "pure A natural minor, classical Ottoman minor",
    moodBoost: "pure classical sadness, Ottoman refinement",
  },
  acem: {
    scaleHint: "F major-like with neutral steps, bright Persian-influenced",
    moodBoost: "bright hopeful, Persian-tinged warmth",
  },
  karcığar: {
    scaleHint:
      "modal scale mixing Dorian base with Phrygian dominant cadence, playful mixed",
    moodBoost: "playful dance energy, mixed moods, festive",
  },
};

// ── 4. Genre → Suno Referans Anchor ───────────────────────────────────────

/**
 * Her genre için Suno'nun eğitim verisinde bileceği Batı referansları.
 * turkishMusicKB'deki sunoStyle'ı GÜÇLENDİRİR.
 */
export const GENRE_WESTERN_ANCHORS: Partial<Record<GenreId, string>> = {
  arabesk:
    "emotional dramatic ballad similar to Portuguese fado meets Middle Eastern string orchestration",
  halk_turku:
    "Balkan/Mediterranean acoustic folk similar to Greek rebetiko and Celtic ballad tradition",
  tsm: "classical Middle Eastern art music similar to Persian classical with Ottoman refinement",
  sehir_pop:
    "European chanson meets Mediterranean pop, similar to French/Italian emotional pop ballad",
  anadolu_rock:
    "1970s psychedelic progressive rock meets Balkan folk fusion, similar to early prog rock with ethnic elements",
  ilahi_sufi:
    "devotional meditative chant similar to Gregorian chant meets Middle Eastern Sufi tradition",
  rap: "conscious hip-hop with Middle Eastern melodic elements, boom-bap meets Mediterranean street poetry",
  fantezi:
    "dramatic emotional crossover similar to Latin bolero meets Middle Eastern popular music",
  oyun_havasi:
    "festive Balkan brass band meets Romani celebration music, wedding dance party",
  ozgun:
    "acoustic protest folk similar to Latin American nueva canción meets Mediterranean singer-songwriter",
};

// ── 5. Master Çeviri Fonksiyonu ───────────────────────────────────────────

/**
 * Tüm Suno optimizasyonlarını tek fonksiyonla uygula.
 * wizard-generate endpoint'inde çağrılır.
 *
 * @returns Suno style'a eklenecek boost string + düzeltilmiş lyrics
 */
export function applySunoOptimizations(params: {
  lyrics: string;
  regionId?: RegionId;
  makamId?: MakamId;
  genreId?: GenreId;
}): {
  optimizedLyrics: string;
  styleBoost: string;
  instrumentOverride: string[] | null;
} {
  const boostParts: string[] = [];

  // 1. Telaffuz düzeltmesi
  const optimizedLyrics = applyPronunciationFixes(params.lyrics);

  // 2. Bölgesel tavır anchor
  if (params.regionId && params.regionId in REGIONAL_SUNO_PROFILES) {
    const profile = REGIONAL_SUNO_PROFILES[params.regionId];
    boostParts.push(profile.westernAnchor);
    boostParts.push(profile.performanceStyle);
    boostParts.push(profile.rhythmHint);
    boostParts.push(profile.vocalStyle);
  }

  // 3. Makam scale boost
  if (params.makamId && params.makamId in MAKAM_SUNO_BOOST) {
    const makamBoost = MAKAM_SUNO_BOOST[params.makamId];
    boostParts.push(makamBoost.scaleHint);
    boostParts.push(makamBoost.moodBoost);
  }

  // 4. Genre Batı anchor
  if (params.genreId && params.genreId in GENRE_WESTERN_ANCHORS) {
    boostParts.push(GENRE_WESTERN_ANCHORS[params.genreId]!);
  }

  // 5. Enstrüman override (bölge varsa bölge enstrümanlarını kullan)
  const instrumentOverride =
    params.regionId && params.regionId in REGIONAL_SUNO_PROFILES
      ? REGIONAL_SUNO_PROFILES[params.regionId].sunoInstruments
      : null;

  return {
    optimizedLyrics,
    styleBoost: boostParts.join(", "),
    instrumentOverride,
  };
}
