/**
 * Wizard Mapping Verileri
 *
 * Akıllı Şarkı Sihirbazı için tüm veri eşlemeleri:
 * - Mood → Makam otomatik eşleme
 * - Mood × Genre affinite matrisi
 * - Mood + Genre → ArtistPreset çözümleme
 * - Tema şablonları
 * - Dönem stil modifikatörleri
 * - UI kart tanımları
 */

import type { WizardMoodId, WizardThemeId } from "@/types";
import type {
  ArtistPresetId,
  GenreId,
  MakamId,
  RegionId,
} from "@/lib/turkishMusicKB";

// ── Mood → Makam Eşlemesi ──────────────────────────────────────────────────

export const MOOD_MAKAM_MAP: Record<
  WizardMoodId,
  { primary: MakamId; fallbacks: MakamId[] }
> = {
  huzunlu: { primary: "hicaz", fallbacks: ["kürdi", "saba"] },
  romantik: { primary: "nihavend", fallbacks: ["uşşak", "buselik"] },
  enerjik: { primary: "karcığar", fallbacks: ["rast", "hüseyni"] },
  nostaljik: { primary: "uşşak", fallbacks: ["nihavend", "hüseyni"] },
  isyankar: { primary: "kürdi", fallbacks: ["hicaz", "nihavend"] },
  huzurlu: { primary: "rast", fallbacks: ["segah", "neva"] },
  coskulu: { primary: "hüseyni", fallbacks: ["muhayyer", "rast"] },
  ozlem: { primary: "uşşak", fallbacks: ["hicaz", "hüseyni"] },
};

// ── Mood × Genre Affinite Matrisi ──────────────────────────────────────────

/** 0-1 arası affinite skoru. Yüksek = mood ile genre daha uyumlu. */
export const MOOD_GENRE_AFFINITY: Record<
  WizardMoodId,
  Partial<Record<GenreId, number>>
> = {
  huzunlu: {
    arabesk: 0.95,
    fantezi: 0.85,
    tsm: 0.8,
    ozgun: 0.75,
    halk_turku: 0.7,
    sehir_pop: 0.55,
    ilahi_sufi: 0.5,
    rap: 0.4,
    anadolu_rock: 0.35,
    oyun_havasi: 0.1,
  },
  romantik: {
    sehir_pop: 0.9,
    tsm: 0.85,
    fantezi: 0.75,
    ozgun: 0.7,
    arabesk: 0.6,
    halk_turku: 0.55,
    ilahi_sufi: 0.4,
    rap: 0.35,
    anadolu_rock: 0.3,
    oyun_havasi: 0.2,
  },
  enerjik: {
    anadolu_rock: 0.9,
    oyun_havasi: 0.85,
    sehir_pop: 0.8,
    rap: 0.75,
    fantezi: 0.5,
    halk_turku: 0.4,
    arabesk: 0.2,
    tsm: 0.1,
    ozgun: 0.3,
    ilahi_sufi: 0.1,
  },
  nostaljik: {
    halk_turku: 0.9,
    arabesk: 0.85,
    ozgun: 0.8,
    tsm: 0.75,
    sehir_pop: 0.65,
    fantezi: 0.6,
    anadolu_rock: 0.5,
    ilahi_sufi: 0.45,
    rap: 0.2,
    oyun_havasi: 0.3,
  },
  isyankar: {
    anadolu_rock: 0.95,
    rap: 0.9,
    ozgun: 0.85,
    halk_turku: 0.5,
    sehir_pop: 0.35,
    arabesk: 0.4,
    fantezi: 0.3,
    tsm: 0.1,
    ilahi_sufi: 0.05,
    oyun_havasi: 0.2,
  },
  huzurlu: {
    ilahi_sufi: 0.95,
    tsm: 0.8,
    halk_turku: 0.7,
    ozgun: 0.65,
    sehir_pop: 0.5,
    arabesk: 0.3,
    fantezi: 0.3,
    anadolu_rock: 0.15,
    rap: 0.1,
    oyun_havasi: 0.2,
  },
  coskulu: {
    oyun_havasi: 0.9,
    sehir_pop: 0.85,
    anadolu_rock: 0.8,
    rap: 0.65,
    fantezi: 0.6,
    halk_turku: 0.5,
    arabesk: 0.2,
    tsm: 0.15,
    ozgun: 0.4,
    ilahi_sufi: 0.1,
  },
  ozlem: {
    halk_turku: 0.9,
    arabesk: 0.85,
    ozgun: 0.8,
    fantezi: 0.75,
    tsm: 0.7,
    sehir_pop: 0.6,
    ilahi_sufi: 0.5,
    anadolu_rock: 0.35,
    rap: 0.3,
    oyun_havasi: 0.1,
  },
};

// ── Mood+Genre → ArtistPreset Çözümleme ────────────────────────────────────

/** (mood, genre) → en uygun artist preset. Tüm kombinasyonlar kapsanır. */
const MOOD_GENRE_ARTIST_MAP: Record<
  WizardMoodId,
  Partial<Record<GenreId, ArtistPresetId>>
> = {
  huzunlu: {
    arabesk: "agir_arabesk",
    fantezi: "fantezi_duygusal",
    tsm: "tsm_klasik",
    ozgun: "ozgun_protest",
    halk_turku: "bozkir_turku",
    sehir_pop: "sehirli_pop",
    ilahi_sufi: "sufi_ilahi",
    rap: "fusion_deneysel",
    anadolu_rock: "anadolu_rock_klasik",
    oyun_havasi: "dans_pop",
  },
  romantik: {
    sehir_pop: "sehirli_pop",
    tsm: "tsm_klasik",
    fantezi: "fantezi_duygusal",
    ozgun: "ozgun_protest",
    arabesk: "agir_arabesk",
    halk_turku: "halk_ozani",
    ilahi_sufi: "sufi_ilahi",
    rap: "fusion_deneysel",
    anadolu_rock: "fusion_deneysel",
    oyun_havasi: "dans_pop",
  },
  enerjik: {
    anadolu_rock: "anadolu_rock_klasik",
    oyun_havasi: "dans_pop",
    sehir_pop: "dans_pop",
    rap: "modern_fusion_rock",
    fantezi: "fantezi_duygusal",
    halk_turku: "bozkir_turku",
    arabesk: "fantezi_duygusal",
    tsm: "tsm_klasik",
    ozgun: "modern_fusion_rock",
    ilahi_sufi: "sufi_ilahi",
  },
  nostaljik: {
    halk_turku: "bozkir_turku",
    arabesk: "agir_arabesk",
    ozgun: "ozgun_protest",
    tsm: "tsm_klasik",
    sehir_pop: "sehirli_pop",
    fantezi: "fantezi_duygusal",
    anadolu_rock: "anadolu_rock_klasik",
    ilahi_sufi: "sufi_ilahi",
    rap: "fusion_deneysel",
    oyun_havasi: "dans_pop",
  },
  isyankar: {
    anadolu_rock: "anadolu_rock_klasik",
    rap: "modern_fusion_rock",
    ozgun: "ozgun_protest",
    halk_turku: "halk_ozani",
    sehir_pop: "modern_fusion_rock",
    arabesk: "agir_arabesk",
    fantezi: "fantezi_duygusal",
    tsm: "tsm_klasik",
    ilahi_sufi: "sufi_ilahi",
    oyun_havasi: "dans_pop",
  },
  huzurlu: {
    ilahi_sufi: "sufi_ilahi",
    tsm: "tsm_klasik",
    halk_turku: "halk_ozani",
    ozgun: "ozgun_protest",
    sehir_pop: "sehirli_pop",
    arabesk: "agir_arabesk",
    fantezi: "fantezi_duygusal",
    anadolu_rock: "fusion_deneysel",
    rap: "fusion_deneysel",
    oyun_havasi: "dans_pop",
  },
  coskulu: {
    oyun_havasi: "dans_pop",
    sehir_pop: "dans_pop",
    anadolu_rock: "modern_fusion_rock",
    rap: "modern_fusion_rock",
    fantezi: "fantezi_duygusal",
    halk_turku: "bozkir_turku",
    arabesk: "fantezi_duygusal",
    tsm: "tsm_klasik",
    ozgun: "fusion_deneysel",
    ilahi_sufi: "sufi_ilahi",
  },
  ozlem: {
    halk_turku: "halk_ozani",
    arabesk: "agir_arabesk",
    ozgun: "ozgun_protest",
    fantezi: "fantezi_duygusal",
    tsm: "tsm_klasik",
    sehir_pop: "sehirli_pop",
    ilahi_sufi: "sufi_ilahi",
    anadolu_rock: "fusion_deneysel",
    rap: "fusion_deneysel",
    oyun_havasi: "dans_pop",
  },
};

/** Mood + Genre'den en uygun ArtistPreset ID'sini çözümle */
export function resolveArtistPreset(
  mood: WizardMoodId,
  genreId: GenreId,
): ArtistPresetId {
  return MOOD_GENRE_ARTIST_MAP[mood]?.[genreId] ?? "sehirli_pop";
}

/** Mood'dan birincil makam ID'sini döndür */
export function resolveMakam(mood: WizardMoodId): MakamId {
  return MOOD_MAKAM_MAP[mood].primary;
}

// ── Dönem Stil Modifikatörleri ─────────────────────────────────────────────

export const ERA_STYLE_MODIFIERS: Record<string, string> = {
  modern: "modern production, 2020s aesthetic, crisp mix",
  klasik: "vintage analog production, 1970s-80s aesthetic, warm tube sound",
  "90lar": "90s Turkish pop production, retro synth, nostalgic mixing",
};

// ── Tema Şablonları ────────────────────────────────────────────────────────

export interface ThemeTemplate {
  id: WizardThemeId;
  label: string;
  icon: string;
  /** Claude'a gönderilecek konu ipucu */
  contextHint: string;
  /** Kültürel detaylar (lyrics zenginleştirme) */
  culturalDetails: string[];
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: "ask",
    label: "Aşk",
    icon: "heart",
    contextHint: "romantik aşk hikayesi, sevgili, kalp, tutku, kavuşma",
    culturalDetails: ["bahar", "gül", "ay ışığı", "mektup", "bekleme"],
  },
  {
    id: "ayrilik",
    label: "Ayrılık",
    icon: "heart-crack",
    contextHint: "ayrılık acısı, vedalaşmak, biten ilişki, geride kalan anılar",
    culturalDetails: [
      "tren garı",
      "son bakış",
      "boş ev",
      "yağmurlu cadde",
      "eski fotoğraflar",
    ],
  },
  {
    id: "gurbet",
    label: "Gurbet",
    icon: "map-pin",
    contextHint:
      "memleket özlemi, gurbette yaşam, vatanını aramak, uzak diyarlar",
    culturalDetails: [
      "fabrika",
      "poğaça",
      "eski radyo",
      "toprak kokusu",
      "ana yemekleri",
    ],
  },
  {
    id: "anne_baba",
    label: "Anne / Baba",
    icon: "flower",
    contextHint: "aile sevgisi, ebeveyn şefkati, çocukluğun sıcaklığı, minnet",
    culturalDetails: ["mutfak", "çay demlemek", "el emeği", "dua", "ninniler"],
  },
  {
    id: "doga",
    label: "Doğa",
    icon: "leaf",
    contextHint: "Anadolu doğası, dağlar, deniz, toprak, mevsimler, huzur",
    culturalDetails: [
      "yayla",
      "dere",
      "çiçek",
      "rüzgar",
      "kuş sesi",
      "gün batımı",
    ],
  },
  {
    id: "hayat",
    label: "Hayat",
    icon: "sun",
    contextHint:
      "hayatın anlamı, varoluş, yol, zaman, değişim, kabullenme, umut",
    culturalDetails: [
      "yol",
      "zaman",
      "ayna",
      "nefes",
      "sabah",
      "yeni başlangıç",
    ],
  },
];

// ── UI Kart Verileri ───────────────────────────────────────────────────────

export interface MoodCard {
  id: WizardMoodId;
  label: string;
  description: string;
  color: string;
  gradient: string;
}

export const MOOD_CARDS: MoodCard[] = [
  {
    id: "huzunlu",
    label: "Hüzünlü",
    description: "Derin duygu, iç acısı",
    color: "#6366f1",
    gradient: "from-indigo-600/30 to-indigo-900/30",
  },
  {
    id: "romantik",
    label: "Romantik",
    description: "Aşk, tutku, sevgi",
    color: "#ec4899",
    gradient: "from-pink-600/30 to-pink-900/30",
  },
  {
    id: "enerjik",
    label: "Enerjik",
    description: "Hareketli, canlı, dans",
    color: "#f59e0b",
    gradient: "from-amber-600/30 to-amber-900/30",
  },
  {
    id: "nostaljik",
    label: "Nostaljik",
    description: "Eski güzel günler",
    color: "#8b5cf6",
    gradient: "from-violet-600/30 to-violet-900/30",
  },
  {
    id: "isyankar",
    label: "İsyankar",
    description: "Güç, öfke, direniş",
    color: "#ef4444",
    gradient: "from-red-600/30 to-red-900/30",
  },
  {
    id: "huzurlu",
    label: "Huzurlu",
    description: "İç huzur, sakinlik",
    color: "#10b981",
    gradient: "from-emerald-600/30 to-emerald-900/30",
  },
  {
    id: "coskulu",
    label: "Coşkulu",
    description: "Neşe, kutlama, şenlik",
    color: "#f97316",
    gradient: "from-orange-600/30 to-orange-900/30",
  },
  {
    id: "ozlem",
    label: "Özlem Dolu",
    description: "Uzaklık, hasret, bekleyiş",
    color: "#3b82f6",
    gradient: "from-blue-600/30 to-blue-900/30",
  },
];

export interface GenreCard {
  id: GenreId;
  label: string;
  description: string;
  color: string;
}

export const GENRE_CARDS: GenreCard[] = [
  {
    id: "arabesk",
    label: "Arabesk",
    description: "Dramatik, string, duygu",
    color: "#a855f7",
  },
  {
    id: "sehir_pop",
    label: "Pop",
    description: "Şehirli, modern, melodik",
    color: "#ec4899",
  },
  {
    id: "halk_turku",
    label: "Türkü",
    description: "Halk, bağlama, otantik",
    color: "#d97706",
  },
  {
    id: "anadolu_rock",
    label: "Rock",
    description: "Anadolu rock, isyan, enerji",
    color: "#ef4444",
  },
  {
    id: "tsm",
    label: "Sanat Müziği",
    description: "TSM, Osmanlı, zarafet",
    color: "#6366f1",
  },
  {
    id: "rap",
    label: "Rap",
    description: "Türkçe rap, hip-hop",
    color: "#64748b",
  },
  {
    id: "ilahi_sufi",
    label: "İlahi / Sufi",
    description: "Manevi, ney, huzur",
    color: "#10b981",
  },
  {
    id: "fantezi",
    label: "Fantezi",
    description: "Duygusal, dramatik vokal",
    color: "#f97316",
  },
  {
    id: "oyun_havasi",
    label: "Oyun Havası",
    description: "Düğün, eğlence, dans",
    color: "#eab308",
  },
  {
    id: "ozgun",
    label: "Özgün",
    description: "Protest, akustik, şiirsel",
    color: "#8b5cf6",
  },
];

/** Genre kartlarını mood affinitesine göre sırala. Üst 3'e "Önerilen" badge. */
export function sortGenresByAffinity(mood: WizardMoodId): GenreCard[] {
  const affinity = MOOD_GENRE_AFFINITY[mood] ?? {};
  return [...GENRE_CARDS].sort(
    (a, b) => (affinity[b.id] ?? 0) - (affinity[a.id] ?? 0),
  );
}

/** Belirli mood için bir genre'nin önerilen olup olmadığını kontrol et (üst 3) */
export function isGenreRecommended(
  mood: WizardMoodId,
  genreId: GenreId,
): boolean {
  const sorted = sortGenresByAffinity(mood);
  return sorted.slice(0, 3).some((g) => g.id === genreId);
}

// ── Bölge Kart Verileri ────────────────────────────────────────────────────

export interface RegionCard {
  id: RegionId;
  label: string;
}

export const REGION_CARDS: RegionCard[] = [
  { id: "marmara", label: "Marmara" },
  { id: "ege", label: "Ege" },
  { id: "akdeniz", label: "Akdeniz" },
  { id: "karadeniz", label: "Karadeniz" },
  { id: "ic_anadolu", label: "İç Anadolu" },
  { id: "doğu", label: "Doğu Anadolu" },
  { id: "guneydogu", label: "Güneydoğu" },
  { id: "trakya", label: "Trakya" },
];

// ── Mood Duygu Etiketleri (Claude lyrics context için) ─────────────────────

export const MOOD_EMOTION_LABELS: Record<WizardMoodId, string> = {
  huzunlu: "hüzün, acı, kayıp, keder",
  romantik: "aşk, tutku, sevgi, özlem",
  enerjik: "enerji, hareket, dans, coşku",
  nostaljik: "nostalji, geçmiş, anılar, özlem",
  isyankar: "isyan, öfke, direniş, güç",
  huzurlu: "huzur, sakinlik, dinginlik, barış",
  coskulu: "neşe, kutlama, sevinç, eğlence",
  ozlem: "özlem, hasret, bekleyiş, uzaklık",
};

// ── Default Vokal Çözümleme ────────────────────────────────────────────────

/** Genre'den default vokal cinsiyetini çözümle */
export function resolveDefaultVocalGender(
  genreId: GenreId,
): "m" | "f" | "instrumental" {
  const femaleGenres: GenreId[] = ["sehir_pop", "tsm"];
  return femaleGenres.includes(genreId) ? "f" : "m";
}

// ── Lyrics Blueprint — Profesyonel Söz Yazımı Altyapısı ───────────────────

/**
 * Her genre için otomatik çözümlenen söz yapısı parametreleri.
 * Kullanıcı hiçbir şey seçmesine gerek yok — genre + mood'dan otomatik gelir.
 */
export interface LyricsBlueprint {
  /** Hece vezni: her satırdaki hece sayısı */
  heceVezni: string;
  /** Durak pattern'i (caesura) */
  durak: string;
  /** Kafiye düzeni */
  kafiyeDuzeni: string;
  /** Kafiye tipi seviyesi */
  kafiyeTipi: string;
  /** Suno vokal tag'leri — bölümlere otomatik eklenir */
  sunoVoiceTags: {
    verse: string[];
    chorus: string[];
    bridge: string[];
    intro?: string[];
    outro?: string[];
  };
  /** Bölüm yapısı şablonu */
  sectionTemplate: string;
  /** Satır uzunluk hedefi */
  lineTarget: string;
  /** Duygusal yay (emotional arc) */
  emotionalArc: string;
  /** İmge yoğunluğu rehberi */
  imageryGuide: string;
  /** Dil kayıt seviyesi */
  languageRegister: string;
  /** Genre-spesifik klişe kara listesi */
  clicheBlacklist: string[];
}

/** Genre'ye göre tam lyrics blueprint çözümleme */
export const GENRE_LYRICS_BLUEPRINTS: Record<GenreId, LyricsBlueprint> = {
  arabesk: {
    heceVezni: "11'li veya serbest (10-13 hece arası)",
    durak: "6+5 veya serbest",
    kafiyeDuzeni: "Verse: AABB, Chorus: ABAB",
    kafiyeTipi: "tam kafiye veya zengin kafiye",
    sunoVoiceTags: {
      intro: ["[Melisma]"],
      verse: ["[Soulful]", "[Emotional]"],
      chorus: ["[Powerful]", "[Melisma]"],
      bridge: ["[Whispered]"],
      outro: ["[Soft]", "[Fade Out]"],
    },
    sectionTemplate:
      "[Intro] — 2 satır, ses açılışı\n[Verse 1] — 6 satır, sahne kur\n[Chorus] — 4 satır, verse'den KISA, tekrarlanabilir hook\n[Verse 2] — 6 satır, derinleştir\n[Bridge] — 4 satır, kabulleniş veya kırılma noktası\n[Chorus]\n[Outro] — 2 satır, sessiz kapanış",
    lineTarget:
      "10-13 hece, melismatik uzatmaya uygun uzun sesli harf finalleri",
    emotionalArc:
      "Verse 1: Acıyı tanıt (sakin, betimleyici) → Chorus: Acıyı haykır (yoğun) → Verse 2: Nedenini anlat (kişisel) → Bridge: Kabulleniş veya isyan → Outro: Teslimiyet",
    imageryGuide:
      "Somut kentsel melankoli: meyhane masası, boş bardak, sigara dumanı, yağmurlu cam, kapanan kapı. Soyut değil — her duyguyu bir SAHNE ile göster.",
    languageRegister:
      "Samimi sen dili, 1980-90 Türkçesi, günlük ama şiirsel. 'Kaderim', 'yaralı gönlüm' gibi arabesk kalıplar doğal kullan ama abartma.",
    clicheBlacklist: [
      "gözlerim dolu dolu",
      "kalbim kırıldı",
      "yağmur yağdı gözlerimden",
      "ruhumda fırtına",
      "sensiz yaşayamam",
      "hayat boş",
      "gece uzun",
      "yıldızlara baktım",
    ],
  },
  halk_turku: {
    heceVezni: "11'li (koşma) veya 8'li (semai)",
    durak: "4+4+3 veya 6+5",
    kafiyeDuzeni:
      "Koşma: abab / cccb / dddb — son dörtlüğe kadar b kafiyesi sabit",
    kafiyeTipi: "tam kafiye, doğal uyak",
    sunoVoiceTags: {
      verse: ["[Soulful]"],
      chorus: ["[Powerful]", "[Vibrato]"],
      bridge: ["[Soft]"],
    },
    sectionTemplate:
      "[Verse 1] — 4 satır (bir dörtlük), 11'li hece, koşma formu\n[Verse 2] — 4 satır\n[Chorus] — 4 satır, yalın ve akılda kalıcı\n[Verse 3] — 4 satır, hikayeyi tamamla\n[Outro] — 2 satır",
    lineTarget: "Kesinlikle 11 hece (4+4+3). Her satırı parmakla say.",
    emotionalArc:
      "Dörtlük 1: Manzara/sahne kur (dağ, dere, yayla) → Dörtlük 2: Duyguya geç → Chorus: Özün sözü → Dörtlük 3: Sonuç/kabullenme",
    imageryGuide:
      "Toprak, su, hayvan, mevsim: 'sabah sisi', 'dere suyu', 'kuzu', 'hasat'. Her dörtlükte en az 2 doğa imgesi. Şehirli imgeler YASAK.",
    languageRegister:
      "Ozanca sen dili: 'yârim', 'kara gözlüm', 'gönül', 'garip'. Edebi süs yok — toprak gibi sade. Aksak vezin hissi.",
    clicheBlacklist: [
      "modern şehir referansları",
      "teknoloji kelimeleri",
      "İngilizce kelimeler",
      "soyut felsefe",
    ],
  },
  tsm: {
    heceVezni: "11'li veya aruz-etkili serbest (10-14 hece)",
    durak: "6+5 veya serbest",
    kafiyeDuzeni:
      "Sarma kafiye (ABBA) veya çapraz (ABAB). Meyan bölümü farklı kafiye.",
    kafiyeTipi: "zengin kafiye veya cinaslı kafiye (kelime oyunu)",
    sunoVoiceTags: {
      verse: ["[Gentle]", "[Vibrato]"],
      chorus: ["[Melisma]", "[Soulful]"],
      bridge: ["[Soft]", "[Breathy]"],
      outro: ["[Fade Out]"],
    },
    sectionTemplate:
      "[Verse 1] (Zemin) — 4 satır, ana tema\n[Chorus] (Nakarat) — 4 satır, zarif tekrar\n[Verse 2] (Meyan) — 4 satır, duygusal zirve, farklı kafiye\n[Chorus]\n[Outro] — 2 satır, nağme kapanışı",
    lineTarget:
      "11-14 hece, uzun sesli harflerle biten satırlar (melismatik teslimat için)",
    emotionalArc:
      "Zemin: Zarif giriş → Nakarat: Ana his → Meyan: DUYGUSAL ZİRVE (en etkileyici bölüm) → Nakarat: Tekrar → Outro: Sessiz çözüm",
    imageryGuide:
      "Divan şiiri geleneği: gül-bülbül, mey-sâki, ab (su/gözyaşı), ateş (aşk), pervane-mum. Modern imgeleri Osmanlı zarafetiyle harmala.",
    languageRegister:
      "Kibar siz dili, Osmanlıca-etkili Türkçe. 'Efendim', 'cânım', 'âşıkım'. Aruz hissi ver ama tam aruz zorla değil. Zarif ve ölçülü.",
    clicheBlacklist: [
      "günlük konuşma dili",
      "argo",
      "sokak dili",
      "pop jargonu",
      "modern slang",
    ],
  },
  sehir_pop: {
    heceVezni: "8'li veya serbest (7-10 hece)",
    durak: "4+4 veya serbest",
    kafiyeDuzeni: "Çapraz kafiye (ABAB) veya AABCCB",
    kafiyeTipi: "yarım kafiye veya tam kafiye — doğal, zorlamadan",
    sunoVoiceTags: {
      verse: ["[Smooth]"],
      chorus: ["[Powerful]", "[Harmonies]"],
      bridge: ["[Breathy]"],
    },
    sectionTemplate:
      "[Verse 1] — 4 satır, hikaye başlat\n[Pre-Chorus] — 2 satır, yükselen gerilim\n[Chorus] — 4 satır, akılda kalıcı hook, verse'den KISA satırlar\n[Verse 2] — 4 satır\n[Pre-Chorus]\n[Chorus]\n[Bridge] — 4 satır, farklı bakış açısı\n[Chorus]\n[Outro] — hook tekrarı",
    lineTarget: "7-10 hece, kısa ve ritmik. Nakarat satırları max 8 hece.",
    emotionalArc:
      "Verse 1: Durumu anlat → Pre-Chorus: Gerilim kur → Chorus: Duygusal patlama → Verse 2: Hikayeyi ilerlet → Bridge: Perspektif değiş → Son Chorus: Yoğunlaşmış tekrar",
    imageryGuide:
      "Kentsel modern: kahve dükkanı, gece yürüyüşü, telefon ekranı, taksi camı, çatı katı. 2-3 metafor/verse, somut ama şiirsel.",
    languageRegister:
      "Modern günlük Türkçe, samimi sen dili ama zarif. Ne sokak dili ne edebi — aradaki denge. Konuşma gibi ama ritmik.",
    clicheBlacklist: [
      "gözlerim dolu dolu",
      "kalbim kırıldı",
      "sensiz ölürüm",
      "gece bitmez",
      "yıldızlar şahit",
    ],
  },
  anadolu_rock: {
    heceVezni: "Serbest (9-13 hece), güçlü vurgulu",
    durak: "Serbest, vurgu tabanlı",
    kafiyeDuzeni: "ABAB veya serbest — anlam kafiyeden önce gelir",
    kafiyeTipi: "tam kafiye, güçlü ses uyumu",
    sunoVoiceTags: {
      verse: ["[Powerful]"],
      chorus: ["[Belted]", "[Intense]"],
      bridge: ["[Whispered]"],
      outro: ["[Crescendo]"],
    },
    sectionTemplate:
      "[Intro] — 2 satır, manifesto açılışı\n[Verse 1] — 6 satır, toplumsal sahne\n[Chorus] — 4 satır, güçlü slogan-hook\n[Verse 2] — 6 satır\n[Bridge] — 4 satır, kişisel → kolektif geçiş\n[Chorus]\n[Outro] — 2-4 satır, güçlü kapanış",
    lineTarget:
      "9-13 hece, güçlü kapanış heceleri. Manifesto gibi kesin cümleler.",
    emotionalArc:
      "Intro: Çağrı → Verse 1: Sorunu göster → Chorus: İsyanı haykır → Verse 2: Kişisel hikaye → Bridge: Umut veya kararlılık → Outro: Güçlü kapanış",
    imageryGuide:
      "İşçi/halk imgeleri: fabrika, tren, zincir, duman, toprak, el. Doğa güçlü: fırtına, dağ, sel. Her verse'te en az 1 güçlü görsel.",
    languageRegister:
      "Direkt, güçlü, manifestovari. 'Biz' dili (kolektif). Kısa kesin cümleler. Soru cümleleri retorik kullan.",
    clicheBlacklist: [
      "pasif kabullenme",
      "romantik aşk klişeleri",
      "yumuşak ifadeler",
    ],
  },
  ilahi_sufi: {
    heceVezni: "7'li veya 8'li",
    durak: "4+3 veya 4+4",
    kafiyeDuzeni: "Düz kafiye (AAAA veya AAAB) — ilahi tekrarı",
    kafiyeTipi: "yarım kafiye veya tam kafiye — sade",
    sunoVoiceTags: {
      verse: ["[Gentle]", "[Chant]"],
      chorus: ["[Choir]", "[Harmonies]"],
      bridge: ["[Whispered]"],
      outro: ["[Fade Out]", "[Soft]"],
    },
    sectionTemplate:
      "[Verse 1] — 4 satır, manevi tema\n[Chorus] — 2-3 satır, tekrarlanan dua/zikir\n[Verse 2] — 4 satır\n[Chorus]\n[Bridge] — 2 satır, derin tefekkür\n[Chorus]\n[Outro] — tekrar, fade out",
    lineTarget: "7-8 hece, sade ve ritmik. Tekrar edilebilir kısa cümleler.",
    emotionalArc:
      "Verse 1: Dünyevi arayış → Chorus: İlahi çağrı → Verse 2: İç yolculuk → Bridge: Teslim oluş → Outro: Huzur",
    imageryGuide:
      "Sufi sembolizm: mum-pervane, gül-diken, derviş-sema, su-arınma, nefes-zikir. Yunus Emre sadeliği — az kelime, derin anlam.",
    languageRegister:
      "Sade, arı Türkçe. 'Aşk' = ilahi aşk. 'Gönül', 'can', 'dost' = Tanrı. Yunus Emre dili, samimi ve derin.",
    clicheBlacklist: [
      "dünyevi aşk dili",
      "modern referanslar",
      "şehir imgeleri",
      "öfke/isyan",
    ],
  },
  rap: {
    heceVezni: "Serbest (10-16 hece), flow tabanlı",
    durak: "Serbest, beat vurgulu",
    kafiyeDuzeni: "Couplet (AABB) veya çoklu iç kafiye",
    kafiyeTipi: "tam kafiye + çok heceli kafiye + assonans + aliterasyon",
    sunoVoiceTags: {
      verse: ["[Rapped]"],
      chorus: ["[Melodic Rap]", "[Harmonies]"],
      bridge: ["[Slow Flow]"],
    },
    sectionTemplate:
      "[Verse 1] — 8 satır, güçlü açılış punchline\n[Chorus] — 4 satır, melodik hook, söylenebilir\n[Verse 2] — 8 satır, hikayeyi ilerlet\n[Bridge] — 4 satır, yavaşla, düşün\n[Chorus]\n[Outro] — 2 satır, son söz",
    lineTarget:
      "10-16 hece, satırlar arası tutarlı uzunluk. Flow kırılmaması için aynı bölümdeki satırlar benzer hece sayısında.",
    emotionalArc:
      "Verse 1: Pozisyon koy → Chorus: Hook → Verse 2: Hikaye/detay → Bridge: Yavaşla, düşünceli → Outro: Son punchline",
    imageryGuide:
      "Kentsel gerçekçilik: sokak, beton, gece, kapüşon, kulaklık. Çoklu kafiye teknikleri: 'sessiz sokaklar, siyah sabahlar' (aliterasyon), 'yollar uzar, umutlar solar' (assonans).",
    languageRegister:
      "Sokak Türkçesi + şiirsel derinlik. Argo doğal kullan ama abartma. Çok heceli kafiyeler ve kelime oyunları kritik.",
    clicheBlacklist: [
      "İngilizce kelime sıkıştırma",
      "Amerikan rap kalıpları",
      "anlamsız flex",
    ],
  },
  fantezi: {
    heceVezni: "11'li veya serbest (9-13 hece)",
    durak: "6+5 veya serbest",
    kafiyeDuzeni: "AABB veya ABAB — akıcı ve duygusal",
    kafiyeTipi: "tam kafiye, güçlü ses uyumu",
    sunoVoiceTags: {
      verse: ["[Emotional]"],
      chorus: ["[Powerful]", "[Melisma]"],
      bridge: ["[Soft]", "[Breathy]"],
    },
    sectionTemplate:
      "[Verse 1] — 6 satır, dramatik sahne\n[Chorus] — 4 satır, büyük duygu\n[Verse 2] — 6 satır\n[Bridge] — 4 satır, iç hesaplaşma\n[Chorus]\n[Outro] — 2 satır",
    lineTarget: "9-13 hece, uzatılabilir ünlü finallerle",
    emotionalArc:
      "Verse 1: Durumu dramatik anlat → Chorus: Büyük duygu patlaması → Verse 2: Kişisel detay → Bridge: Kabul veya yenilgi → Outro: Son söz",
    imageryGuide:
      "Güneydoğu sıcaklığı: kerpiç ev, sıcak rüzgar, nar, çay ocağı. Ağabey samimiyeti — dramatik ama içten. Her verse'te somut bir mekan.",
    languageRegister:
      "Samimi sen dili, biraz abartılı ama içten. 'Gözlerin', 'haram olsun', 'vurdun mu'. Güneydoğu ağzı hafif hissettir.",
    clicheBlacklist: [
      "batılı pop kalıpları",
      "soğuk/mesafeli dil",
      "entelektüel jargon",
    ],
  },
  oyun_havasi: {
    heceVezni: "7'li veya 8'li — kısa, ritmik",
    durak: "4+3 veya 4+4",
    kafiyeDuzeni: "AABB — basit, tekrar eden",
    kafiyeTipi: "yarım kafiye veya tam kafiye — eğlenceli ses uyumu",
    sunoVoiceTags: {
      verse: ["[Energetic]"],
      chorus: ["[Shouted]", "[Call and Response]"],
      bridge: ["[Ad-libs]"],
    },
    sectionTemplate:
      "[Verse 1] — 4 satır, sahneyi kur (düğün, halay, festival)\n[Chorus] — 4 satır, tekrar edilen dans sloganı\n[Verse 2] — 4 satır\n[Chorus]\n[Bridge] — 2 satır, 'hep birlikte!' çağrısı\n[Chorus]\n[Outro] — hook tekrarı",
    lineTarget:
      "7-8 hece, kısa ve ritmik. Söylenmesi kolay, tekrar edilebilir.",
    emotionalArc:
      "Baştan sona enerji! Giriş: Davet → Verse: Eğlence sahnesi → Chorus: Dans çağrısı → Kapanış: Doruk",
    imageryGuide:
      "Festival/düğün: davul, zurna, halı, çadır, halay, gelin, düğün sofrası. Hareket fiilleri: oyna, dön, zıpla, gel.",
    languageRegister:
      "Neşeli, samimi, kolektif. 'Hadi!', 'Haydi!', 'Oyna!', 'Gel!'. Emirli cümleler. Nidalar bol.",
    clicheBlacklist: [
      "hüzünlü ifadeler",
      "felsefi derinlik",
      "karmaşık metaforlar",
    ],
  },
  ozgun: {
    heceVezni: "11'li (6+5) veya 8'li",
    durak: "6+5 veya 4+4",
    kafiyeDuzeni: "Çapraz (ABAB) — şiirsel, düşünceli",
    kafiyeTipi: "tam kafiye, doğal uyak",
    sunoVoiceTags: {
      verse: ["[Gentle]", "[Soulful]"],
      chorus: ["[Powerful]"],
      bridge: ["[Whispered]"],
    },
    sectionTemplate:
      "[Verse 1] — 6 satır, toplumsal gözlem veya kişisel hikaye\n[Chorus] — 4 satır, evrensel mesaj\n[Verse 2] — 6 satır\n[Bridge] — 4 satır, umut veya çağrı\n[Chorus]\n[Outro] — 2 satır, sessiz ama güçlü kapanış",
    lineTarget: "11 hece (6+5), nefes uzunluğunda satırlar.",
    emotionalArc:
      "Verse 1: Sorunu/durumu göster → Chorus: Evrensel gerçeği söyle → Verse 2: Kişisel bağlantı → Bridge: Umut veya çözüm → Outro: Sessiz güç",
    imageryGuide:
      "Toplumsal: gurbetçi, fabrika, hasret, mektup, sürgün. Doğa-toplum bağı: toprak=vatan, su=özgürlük. Samimi ve siyasal.",
    languageRegister:
      "Şiirsel ama anlaşılır. Ne sokak dili ne edebi — protest edebiyat. 'Kardeşim' dili, samimi ve direkt.",
    clicheBlacklist: [
      "apolitik romantizm",
      "yüzeysel eğlence",
      "ticari pop kalıpları",
    ],
  },
};

/** Genre + Mood'dan full lyrics blueprint çözümle */
export function resolveLyricsBlueprint(genreId: GenreId): LyricsBlueprint {
  return GENRE_LYRICS_BLUEPRINTS[genreId] ?? GENRE_LYRICS_BLUEPRINTS.sehir_pop;
}

// ── Türkçe Genel Klişe Kara Listesi ──────────────────────────────────────

export const TURKISH_CLICHE_BLACKLIST = [
  "gözlerim dolu dolu",
  "kalbim kırıldı",
  "yağmur yağdı gözlerimden",
  "ruhumda fırtına",
  "sensiz yaşayamam",
  "hayat boş",
  "gece uzun",
  "yıldızlara baktım",
  "her şey bitti",
  "dünya durdu",
  "içim yanıyor",
  "sen gidince",
  "aşkın ateşi",
  "kalp kırığı",
];
