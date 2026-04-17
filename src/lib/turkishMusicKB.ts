/**
 * Türk Müziği Bilgi Tabanı (Knowledge Base)
 *
 * Suno API'ye yapılan her isteği Türk müzik geleneklerine uygun şekilde
 * zenginleştirmek için kullanılır. Stil preset'leri, yöresel ağız haritaları,
 * makam—key signature eşleştirmesi ve janr preset'leri içerir.
 *
 * ⚠️ KRİTİK: Bu dosyada veya Suno payload'larında **hiçbir sanatçı adı**
 * geçmez. Suno API telif filtrelerine takılmamak için stil preset'leri
 * karakteristik özellikler (enstrümantasyon, dönem, ton, duygu) üzerinden
 * tanımlanır. Claude'a giden lyrics context'inde de sanatçı adı yer almaz.
 */

// ── Tipler ────────────────────────────────────────────────────────────────────

/** Stil preset ID'leri — artist değil stil tabanlı */
export type ArtistPresetId =
  | "agir_arabesk"
  | "sehirli_pop"
  | "bozkir_turku"
  | "halk_ozani"
  | "anadolu_rock_klasik"
  | "fusion_deneysel"
  | "dans_pop"
  | "sufi_ilahi"
  | "ozgun_protest"
  | "fantezi_duygusal"
  | "tsm_klasik"
  | "modern_fusion_rock"
  | "doksanlar_pop"
  | "modern_turk_pop"
  | "karadeniz_horon"
  | "turkce_rap"
  | "roman_havasi"
  | "oyun_havasi_dugun"
  | "slow_arabesk_pop"
  | "akustik_unplugged";

export type RegionId =
  | "karadeniz"
  | "ege"
  | "doğu"
  | "ic_anadolu"
  | "trakya"
  | "akdeniz"
  | "guneydogu"
  | "marmara";

export type MakamId =
  | "uşşak"
  | "hicaz"
  | "hicazkar"
  | "hüseyni"
  | "kürdi"
  | "nihavend"
  | "rast"
  | "segah"
  | "saba"
  | "muhayyer"
  | "neva"
  | "buselik"
  | "acem"
  | "karcığar";

export type GenreId =
  | "arabesk"
  | "halk_turku"
  | "tsm"
  | "sehir_pop"
  | "anadolu_rock"
  | "ilahi_sufi"
  | "rap"
  | "fantezi"
  | "oyun_havasi"
  | "ozgun"
  | "karadeniz"
  | "roman"
  | "akustik"
  | "arabesk_pop";

export interface ArtistPreset {
  id: ArtistPresetId;
  label: string;
  icon: string;
  description: string;
  /** Suno style field — İngilizce, karakteristik özellikler, SANATÇI ADI YOK */
  sunoStyle: string;
  /** Negative tags — istenmeyen tarz */
  negativeTags: string;
  /** Suno styleWeight 0-1 */
  styleWeight: number;
  /** Suno weirdnessConstraint 0-1 */
  weirdnessConstraint: number;
  vocalGender: "m" | "f";
  bpm: [number, number];
  referenceMakams: MakamId[];
  /** Claude'a verilecek tarz açıklaması — sanatçı adı yok, karakteristik odaklı */
  lyricsStyle: string;
  /** Suno model tercihi */
  preferredModel?: "V4_5ALL" | "V5";
}

export interface RegionPreset {
  id: RegionId;
  label: string;
  instruments: string[];
  rhythms: string[];
  preferredMakams: MakamId[];
  /** Türkçe yazım → yöresel telaffuz */
  lyricsLehce: Record<string, string>;
  /** Bu yöreye özgü tema motifleri */
  lyricsThemes: string[];
}

export interface MakamPreset {
  id: MakamId;
  label: string;
  /** Suno için yakın western key signature */
  keySignature: string;
  mood: string;
  /** Suno style'a eklenecek hint */
  sunoHint: string;
}

export interface GenrePreset {
  id: GenreId;
  label: string;
  sunoStyle: string;
  negativeTags: string;
  styleWeight: number;
  weirdnessConstraint: number;
  bpm: [number, number];
}

// ── Default Suno parametreleri ───────────────────────────────────────────────

/** Her isteğe eklenen anti-anglo negative tag baseline */
export const DEFAULT_NEGATIVE_TAGS =
  "western pop, american pop, k-pop, latin music, autotune, synthetic vocal, robotic voice, anglo accent, english pronunciation, generic edm, mumble rap";

/** Türk vokal kalite ipuçları — pozitif quality markers (sanatçı adı yok) */
export const TURKISH_QUALITY_MARKERS =
  "natural authentic Turkish vocals, real organic instruments, genuine emotional voice, warm analog tone, not autotuned, professional studio production, authentic Turkish pronunciation with proper diacritics, clear Turkish diction, no Anglo accent";

// ── Stil Presetleri (sanatçı adı yok, karakteristik tabanlı) ─────────────────

export const ARTIST_PRESETS: Record<ArtistPresetId, ArtistPreset> = {
  agir_arabesk: {
    id: "agir_arabesk",
    label: "Ağır Arabesk",
    icon: "🎻",
    description: "Dramatik string, melisma, ağır duygu",
    sunoStyle:
      "Turkish arabesque, dramatic string orchestra, heavy melisma, dark slow tempo, electric saz, darbuka, def, melancholic deep male vocal with gırtlak ornamentation, 1980s analog Istanbul production, passionate emotional delivery",
    negativeTags:
      "modern pop, autotune, electronic, anglo, k-pop, edm, synthwave",
    styleWeight: 0.85,
    weirdnessConstraint: 0.15,
    vocalGender: "m",
    bpm: [70, 90],
    referenceMakams: ["hicaz", "uşşak", "kürdi"],
    lyricsStyle:
      "Ağır arabesk üslubu: yakarış, kabulleniş, kader, affetmek. Ağır acı ama dramatik değil — sakin teslimiyet. 'Allahım', 'kader', 'yara' kelimelerini doğal kullan. Meyhane, rakı, yağmur motifleri yasak değil ama klişeden kaçın.",
  },
  sehirli_pop: {
    id: "sehirli_pop",
    label: "Şehirli Pop",
    icon: "🌹",
    description: "Şehir popu, melankolik, modern prodüksiyon",
    sunoStyle:
      "Turkish urban adult contemporary pop, melancholic sophisticated production, female vocal with emotional depth, piano, string section, modern drum kit, light bağlama accent, 90s-2000s Istanbul pop aesthetic, thoughtful melodic lines",
    negativeTags:
      "rural folk, raw arabesque, distorted rock, autotune, anglo accent",
    styleWeight: 0.78,
    weirdnessConstraint: 0.25,
    vocalGender: "f",
    bpm: [75, 105],
    referenceMakams: ["nihavend", "buselik", "kürdi"],
    lyricsStyle:
      "Şehirli kadın popu üslubu: şehirli kadın bakışı, melankolik ama güçlü, edebi imgeler, aşk/kayıp/kadınlık. Klişelerden kaç. Modern zarafet, naif değil.",
  },
  bozkir_turku: {
    id: "bozkir_turku",
    label: "Bozkır Türküsü",
    icon: "🌾",
    description: "Sade bağlama, çıplak vokal, halk sesi",
    sunoStyle:
      "Raw authentic Central Anatolian folk türkü, solo bağlama (saz), unaccompanied or sparse arrangement, emotional male vocal with çatlatma ornamentation, Bozlak tradition, Abdal minstrel style, dry earthy production",
    negativeTags:
      "modern production, electronic, pop, rock, autotune, full band, electric guitar",
    styleWeight: 0.88,
    weirdnessConstraint: 0.12,
    vocalGender: "m",
    bpm: [80, 110],
    referenceMakams: ["hüseyni", "uşşak", "muhayyer"],
    lyricsStyle:
      "Bozkır türküsü üslubu: çıplak halk dili, ozanca, 'kara gözlüm', 'yâri', 'gönül'. Edebi süs yok — toprak gibi sade ama derin. Aksak vezin tercih. İç Anadolu hissi.",
  },
  halk_ozani: {
    id: "halk_ozani",
    label: "Halk Ozanı",
    icon: "🕊️",
    description: "Felsefi sade, solo bağlama ve vokal",
    sunoStyle:
      "Turkish folk minstrel song tradition, pure solo vocal with bağlama, philosophical contemplative tone, Central Anatolian rural style, simple yet profound delivery, no production layers",
    negativeTags:
      "modern instruments, electronic, full ensemble, pop, rock, drums",
    styleWeight: 0.9,
    weirdnessConstraint: 0.1,
    vocalGender: "m",
    bpm: [60, 80],
    referenceMakams: ["uşşak", "hüseyni"],
    lyricsStyle:
      "Halk ozanı üslubu: felsefi sade, ahmak/aşk/yol/dost temaları. 4+4 hece veya 11'li hece vezni. Ozanca selamlama, dostluk, hakikat arayışı.",
  },
  anadolu_rock_klasik: {
    id: "anadolu_rock_klasik",
    label: "Anadolu Rock Klasik",
    icon: "🎸",
    description: "70s psychedelic folk rock, isyan",
    sunoStyle:
      "Anadolu rock, fusion of Anatolian folk melodies with psychedelic progressive rock, distorted electric saz, electric guitar, bass, drum kit, Hammond organ, powerful Turkish male vocal, 1970s analog production, socially conscious energy",
    negativeTags: "pop, modern edm, autotune, anglo rock, country, simple folk",
    styleWeight: 0.75,
    weirdnessConstraint: 0.4,
    vocalGender: "m",
    bpm: [100, 140],
    referenceMakams: ["kürdi", "nihavend", "hicaz"],
    lyricsStyle:
      "Anadolu rock klasik üslubu: toplumsal isyan, işçi, halk, eleştirel, güçlü, manifestovari. Silindir/zincir/kara tren gibi işçi imgeleri. Cesur ve direkt.",
  },
  fusion_deneysel: {
    id: "fusion_deneysel",
    label: "Fusion Deneysel",
    icon: "🎭",
    description: "Eklektik, sıcak, hikaye anlatıcı",
    sunoStyle:
      "Turkish progressive folk rock fusion, eclectic instrumentation mixing bağlama with synth, Hammond organ, electric guitar, Anatolian melodic phrases with experimental arrangements, warm friendly male vocal, late 70s-80s production, storytelling narrative style",
    negativeTags: "metal, edm, autotune, modern trap, generic pop",
    styleWeight: 0.7,
    weirdnessConstraint: 0.45,
    vocalGender: "m",
    bpm: [90, 130],
    referenceMakams: ["nihavend", "hüseyni", "rast"],
    lyricsStyle:
      "Fusion deneysel üslubu: hikaye anlatıcı, çocuksu hayalgücü, didaktik ama eğlenceli, Anadolu'nun içinde büyüyen biri gibi samimi. 'Dağlar dağlar' tarzı bağ.",
  },
  dans_pop: {
    id: "dans_pop",
    label: "Dans Pop",
    icon: "⚡",
    description: "Enerjik, modern, akılda kalıcı",
    sunoStyle:
      "Turkish modern dance pop, energetic catchy melodic hooks, drum kit, electric guitar, synth, occasional darbuka and bağlama accent, charismatic male vocal, 2000s Mediterranean pop production style",
    negativeTags: "raw folk, arabesque, traditional, slow ballad, anglo pop",
    styleWeight: 0.7,
    weirdnessConstraint: 0.3,
    vocalGender: "m",
    bpm: [110, 140],
    referenceMakams: ["nihavend", "hicaz", "kürdi"],
    lyricsStyle:
      "Dans pop üslubu: dans pop, akılda kalıcı nakarat, romantik flört, modern enerjik. Eğlence-aşk dengesi. Kısa, ritmik, söylemesi kolay satırlar.",
  },
  sufi_ilahi: {
    id: "sufi_ilahi",
    label: "Sufi İlahi",
    icon: "🌙",
    description: "Manevi, ney, bendir, huzur",
    sunoStyle:
      "Turkish Sufi devotional ilahi music, ney flute, bendir, def, tanbur, choir, slow meditative usul rhythm, reverent male or mixed vocal, Mevlevi tradition atmosphere, spiritual contemplative mood",
    negativeTags: "pop, rock, edm, anglo, secular, modern beats",
    styleWeight: 0.88,
    weirdnessConstraint: 0.12,
    vocalGender: "m",
    bpm: [55, 80],
    referenceMakams: ["rast", "hüseyni", "uşşak", "neva"],
    lyricsStyle:
      "Sufi ilahi üslubu: aşk = ilahi aşk, gönül, derviş, semazen, hiçlik, fenafillah. Yunus Emre dili — sade ve derin. 'Sevelim sevilelim' tarzı minimal.",
  },
  ozgun_protest: {
    id: "ozgun_protest",
    label: "Özgün Protest",
    icon: "📜",
    description: "Akustik, sosyal duyarlı, hikaye",
    sunoStyle:
      "Turkish özgün protest folk, acoustic arrangement with bağlama and acoustic guitar, light percussion, sincere emotional male vocal, narrative storytelling delivery, 80s-90s production, poetic and politically aware feel",
    negativeTags: "pop, edm, autotune, generic, commercial production",
    styleWeight: 0.82,
    weirdnessConstraint: 0.2,
    vocalGender: "m",
    bpm: [75, 100],
    referenceMakams: ["uşşak", "hicaz", "kürdi"],
    lyricsStyle:
      "Özgün protest üslubu: politik bilinç, sürgün, yara, sevgili-mücadele birleşimi. Samimi ve siyasal. 'Beni vurmadan geç' tarzı direkt ve şiirsel.",
  },
  fantezi_duygusal: {
    id: "fantezi_duygusal",
    label: "Fantezi Duygusal",
    icon: "🎤",
    description: "Güneydoğu havası, uzun hava, dramatik",
    sunoStyle:
      "Turkish fantezi music, southeastern Anatolian flavor, dramatic male vocal with extended melisma, bağlama, darbuka, strings, sometimes uzun hava (free rhythm) sections, 90s-2000s production, big emotional gestures",
    negativeTags: "pop, modern edm, soft acoustic, anglo, k-pop",
    styleWeight: 0.8,
    weirdnessConstraint: 0.2,
    vocalGender: "m",
    bpm: [80, 110],
    referenceMakams: ["hüseyni", "hicaz", "uşşak"],
    lyricsStyle:
      "Fantezi duygusal üslubu: ağabey samimiyeti, sevgili, gurbet, Urfa/Diyarbakır havası. 'Gözlerin', 'haram olsun' tarzı dramatik içtenlik.",
  },
  tsm_klasik: {
    id: "tsm_klasik",
    label: "TSM Klasik",
    icon: "🎵",
    description: "Osmanlı zarafeti, makam, nağme",
    sunoStyle:
      "Classical Turkish art music (TSM), Ottoman court tradition, ud, kanun, ney, tanbur, kemençe, kudüm, refined classical vocal with ornate nağme and gazel-style melismatic delivery, makam-based phrasing, slow düyek or semai usul",
    negativeTags:
      "pop, rock, edm, modern, distorted, electric guitar, autotune",
    styleWeight: 0.9,
    weirdnessConstraint: 0.1,
    vocalGender: "f",
    bpm: [55, 80],
    referenceMakams: ["nihavend", "rast", "hicazkar", "saba", "segah"],
    lyricsStyle:
      "TSM klasik üslubu: Osmanlı zarafeti, divan şiiri imgeleri (gül, bülbül, mey, sâki). Aruz vezni hissi. 'Bir ihtimal daha var', 'gönlümün şarkısı' tarzı zarif.",
  },
  modern_fusion_rock: {
    id: "modern_fusion_rock",
    label: "Modern Fusion Rock",
    icon: "🤘",
    description: "Folk-rock, modern üretim, kentli",
    sunoStyle:
      "Modern Anadolu rock, contemporary fusion of Anatolian folk melodies with rock band, distorted guitar, bass, drum kit, electric saz accents, energetic male vocal with folk inflection, modern 2000s-2010s production",
    negativeTags: "trap, edm, generic pop, country, anglo rock cliches",
    styleWeight: 0.72,
    weirdnessConstraint: 0.35,
    vocalGender: "m",
    bpm: [110, 150],
    referenceMakams: ["kürdi", "nihavend", "hicaz"],
    lyricsStyle:
      "Modern fusion rock üslubu: kentli birey, varoluş, yalnızlık, isyanla dinginlik karışımı. Sert ve şiirsel.",
  },
  doksanlar_pop: {
    id: "doksanlar_pop",
    label: "90'lar Türk Pop",
    icon: "💿",
    description: "Keyboard-driven, catchy, Akdeniz pop hissi",
    sunoStyle:
      "90s Turkish Mediterranean pop, clean keyboard-driven production, catchy melodic hooks, drum machine with live percussion, bright synth pads, chorus reverb, radio-friendly female or male vocal, warm analog mix, upbeat nostalgic feel",
    negativeTags:
      "trap, autotune, lo-fi, dark, heavy metal, raw folk, modern edm, mumble",
    styleWeight: 0.75,
    weirdnessConstraint: 0.25,
    vocalGender: "f",
    bpm: [100, 125],
    referenceMakams: ["nihavend", "kürdi", "hicaz"],
    lyricsStyle:
      "90'lar Türk pop üslubu: romantik ama hafif, akılda kalıcı nakarat, radyofonik, yaz havası. 'Seninle', 'bir daha' tarzı basit ama etkili kancalar. Modern argo yok.",
  },
  modern_turk_pop: {
    id: "modern_turk_pop",
    label: "Modern Türk Pop",
    icon: "🔥",
    description: "Trap etkili, urban, kısa formatlı",
    sunoStyle:
      "Modern Turkish urban pop, trap-influenced beat, 808 bass, subtle autotune on vocals, slick hi-hat rolls, dark synth atmosphere, short catchy hook, confident Turkish vocal delivery, 2020s polished production, minimal arrangement",
    negativeTags:
      "traditional folk, bağlama, raw acoustic, vintage analog, string orchestra, rural",
    styleWeight: 0.7,
    weirdnessConstraint: 0.3,
    vocalGender: "m",
    bpm: [85, 110],
    referenceMakams: ["kürdi", "nihavend"],
    lyricsStyle:
      "Modern Türk pop üslubu: urban, kısa cümleler, Instagram/TikTok çağı, flexsiz ama özgüvenli. Minimal kelime, maksimal etki. Tekrarlanan hook kritik.",
  },
  karadeniz_horon: {
    id: "karadeniz_horon",
    label: "Karadeniz Müziği",
    icon: "🪗",
    description: "Kemençe, tulum, horon, 7/8 ritim",
    sunoStyle:
      "Black Sea Turkish folk, kemençe fiddle, tulum bagpipe, davul, fast 7/8 additive rhythm, energetic horon circle dance, nasal resonant male vocal, shouted interjections, communal festive energy, Celtic-like folk intensity",
    negativeTags:
      "slow ballad, pop, electronic, autotune, piano, string orchestra, western rock",
    styleWeight: 0.85,
    weirdnessConstraint: 0.15,
    vocalGender: "m",
    bpm: [140, 170],
    referenceMakams: ["muhayyer", "uşşak", "hüseyni"],
    lyricsStyle:
      "Karadeniz üslubu: yayla, dağ, dere, horon, fındık. Yöresel lehçe ('n'apaysun', 'geliyrum'). Kısa ritmik satırlar, dans çağrısı. Esprili ve samimi.",
  },
  turkce_rap: {
    id: "turkce_rap",
    label: "Türkçe Rap",
    icon: "🎤",
    description: "Trap beats, 808 bass, conscious/street",
    sunoStyle:
      "Turkish conscious rap, dark trap production, heavy 808 bass, rolling hi-hats, atmospheric dark synth pads, confident Turkish flow with clear diction, melodic hook sections, 2020s hip-hop production, boom-bap foundation with modern trap elements",
    negativeTags:
      "folk instruments, bağlama, ney, traditional, pop ballad, anglo rap flow, mumble rap",
    styleWeight: 0.72,
    weirdnessConstraint: 0.3,
    vocalGender: "m",
    bpm: [130, 155],
    referenceMakams: ["kürdi", "hicaz"],
    lyricsStyle:
      "Türkçe rap üslubu: sokak gerçekliği, bilinç, toplumsal eleştiri. Çok heceli kafiyeler ve iç kafiye kritik. Türkçe flow — Amerikan rap taklidi değil. Punchline ve wordplay.",
  },
  roman_havasi: {
    id: "roman_havasi",
    label: "Roman Havası",
    icon: "🎺",
    description: "Klarnet lead, 9/8, Romani swing, Trakya",
    sunoStyle:
      "Romani Thracian dance music, virtuosic clarinet lead, syncopated 9/8 aksak rhythm, darbuka and def percussion, festive wedding celebration energy, Romani swing groove, Balkan brass influences, energetic dance, shouted party interjections",
    negativeTags:
      "slow, sad, classical, autotune, electronic, piano ballad, western pop",
    styleWeight: 0.8,
    weirdnessConstraint: 0.2,
    vocalGender: "m",
    bpm: [130, 155],
    referenceMakams: ["hicaz", "kürdi", "karcığar"],
    lyricsStyle:
      "Roman havası üslubu: düğün eğlencesi, dans çağrısı, 'haydi oyna' nidaları, neşeli ve hareketli. Kısa tekrar eden sloganlar. Trakya/Edirne havası.",
  },
  oyun_havasi_dugun: {
    id: "oyun_havasi_dugun",
    label: "Oyun Havası / Düğün",
    icon: "🥁",
    description: "Davul-zurna, halay, şenlik",
    sunoStyle:
      "Turkish wedding dance music, davul and zurna duo, festive halay circle dance, communal celebration, fast energetic tempo, call and response vocals, traditional Anatolian dance rhythm, folk festival atmosphere, powerful rhythmic drive",
    negativeTags:
      "slow ballad, sad, electronic, autotune, piano, soft, intimate, western pop",
    styleWeight: 0.82,
    weirdnessConstraint: 0.18,
    vocalGender: "m",
    bpm: [120, 155],
    referenceMakams: ["hüseyni", "karcığar", "uşşak"],
    lyricsStyle:
      "Oyun havası üslubu: düğün, halay, bayram, eğlence. 'Haydi!', 'Oyna!', 'Gel!' nidaları. Kolektif neşe, kısa ritmik tekrarlar. Felsefi derinlik YOK.",
  },
  slow_arabesk_pop: {
    id: "slow_arabesk_pop",
    label: "Slow Arabesk Pop",
    icon: "💔",
    description: "Arabesk duygu + pop prodüksiyon, 2000'ler",
    sunoStyle:
      "Turkish arabesk pop crossover, arabesk emotional depth with modern pop production, string section with modern drum kit, bağlama accent, piano, accessible romantic vocal, 2000s polished mix, melancholic but radio-friendly, slower tempo ballad",
    negativeTags:
      "raw folk, pure arabesk, heavy distortion, trap, edm, anglo pop, k-pop",
    styleWeight: 0.75,
    weirdnessConstraint: 0.25,
    vocalGender: "m",
    bpm: [70, 95],
    referenceMakams: ["nihavend", "hicaz", "kürdi"],
    lyricsStyle:
      "Slow arabesk pop üslubu: arabesk acısı ama pop erişilebilirliği. Romantik, duygusal, modern Türkçe. Klasik arabesk kadar ağır değil ama yüzeysel de değil.",
  },
  akustik_unplugged: {
    id: "akustik_unplugged",
    label: "Akustik / Unplugged",
    icon: "🎶",
    description: "Stripped-down, samimi, kahvehane hissi",
    sunoStyle:
      "Turkish acoustic unplugged, stripped-down intimate arrangement, acoustic guitar and bağlama duo, light cajon or no percussion, warm close-mic vocals, coffeehouse atmosphere, raw natural recording feel, gentle finger-picked guitar, minimal production",
    negativeTags:
      "full band, electronic, drum kit, heavy production, distortion, autotune, orchestra, edm",
    styleWeight: 0.8,
    weirdnessConstraint: 0.2,
    vocalGender: "m",
    bpm: [75, 100],
    referenceMakams: ["uşşak", "nihavend", "hüseyni"],
    lyricsStyle:
      "Akustik unplugged üslubu: samimi, fısıltıya yakın, dostane. Kahvehane sohbeti gibi. İçten ve basit ama derin. Abartı yok, samimiyet var.",
  },
};

// ── Yöre Presetleri ──────────────────────────────────────────────────────────

export const REGIONS: Record<RegionId, RegionPreset> = {
  karadeniz: {
    id: "karadeniz",
    label: "Karadeniz",
    instruments: ["kemençe", "tulum", "davul", "zurna"],
    rhythms: ["7/16 horon", "9/16 aksak"],
    preferredMakams: ["muhayyer", "uşşak", "hüseyni"],
    lyricsLehce: {
      yapıyorum: "yapayrum",
      geliyorum: "geliyrum",
      "ne yapıyorsun": "n'apaysun",
      görüyorum: "göreyrum",
      "anladım ki": "anladum ki",
      söyle: "soyle",
    },
    lyricsThemes: ["yayla", "dağ", "dere", "horon", "fındık", "deniz", "balık"],
  },
  ege: {
    id: "ege",
    label: "Ege",
    instruments: ["bağlama", "ud", "klarnet", "darbuka"],
    rhythms: ["9/8 zeybek", "4/4"],
    preferredMakams: ["hüseyni", "rast", "muhayyer"],
    lyricsLehce: {
      "olur mu": "ola mı",
      "ne diyorsun": "ne diyon",
      yapıyorum: "yapıyom",
    },
    lyricsThemes: [
      "zeybek",
      "efe",
      "zeytin",
      "gemi",
      "Ege",
      "İzmir",
      "kırzılım",
    ],
  },
  doğu: {
    id: "doğu",
    label: "Doğu Anadolu",
    instruments: ["bağlama", "kaval", "davul", "zurna", "mey"],
    rhythms: ["aksak halay", "9/8"],
    preferredMakams: ["hüseyni", "hicaz", "uşşak"],
    lyricsLehce: {
      "ne yapıyorsun": "ne edisen",
      gidiyorum: "gidirem",
    },
    lyricsThemes: ["dağ", "Erzurum", "Ağrı", "kar", "halay", "asker", "gurbet"],
  },
  ic_anadolu: {
    id: "ic_anadolu",
    label: "İç Anadolu",
    instruments: ["bağlama", "kemane", "davul"],
    rhythms: ["bozlak rubato", "10/8"],
    preferredMakams: ["hüseyni", "uşşak", "muhayyer"],
    lyricsLehce: {},
    lyricsThemes: ["bozkır", "Konya", "Kayseri", "harman", "buğday", "ova"],
  },
  trakya: {
    id: "trakya",
    label: "Trakya",
    instruments: ["klarnet", "darbuka", "def", "ud"],
    rhythms: ["9/8 oyun havası", "Roman havası"],
    preferredMakams: ["hicaz", "kürdi", "nihavend"],
    lyricsLehce: {},
    lyricsThemes: ["roman", "düğün", "Edirne", "Meriç", "ayçiçeği"],
  },
  akdeniz: {
    id: "akdeniz",
    label: "Akdeniz",
    instruments: ["bağlama", "ud", "darbuka"],
    rhythms: ["4/4", "5/8 türk halk"],
    preferredMakams: ["uşşak", "hicaz", "rast"],
    lyricsLehce: {},
    lyricsThemes: ["deniz", "Antalya", "yaz", "portakal", "Toros", "yörük"],
  },
  guneydogu: {
    id: "guneydogu",
    label: "Güneydoğu Anadolu",
    instruments: ["bağlama", "ud", "tef", "kaval", "mey"],
    rhythms: ["uzun hava", "halay aksak"],
    preferredMakams: ["hicaz", "hüseyni", "uşşak"],
    lyricsLehce: {},
    lyricsThemes: [
      "Urfa",
      "Diyarbakır",
      "kale",
      "Mardin",
      "kerpiç",
      "Mezopotamya",
      "uzun hava",
    ],
  },
  marmara: {
    id: "marmara",
    label: "Marmara / İstanbul",
    instruments: ["piano", "ud", "kanun", "string ensemble", "drum kit"],
    rhythms: ["4/4", "6/8 ballad"],
    preferredMakams: ["nihavend", "kürdi", "hicaz"],
    lyricsLehce: {},
    lyricsThemes: [
      "İstanbul",
      "Boğaz",
      "vapur",
      "köprü",
      "Beyoğlu",
      "yağmur",
      "şehir",
    ],
  },
};

// ── Makam Presetleri ─────────────────────────────────────────────────────────

export const MAKAMS: Record<MakamId, MakamPreset> = {
  uşşak: {
    id: "uşşak",
    label: "Uşşak",
    keySignature: "Am",
    mood: "lyrical, longing, narrative",
    sunoHint:
      "in A minor (uşşak makam) — natural minor with descending scalar phrases",
  },
  hicaz: {
    id: "hicaz",
    label: "Hicaz",
    keySignature: "A Phrygian dominant",
    mood: "yearning, exotic, dramatic",
    sunoHint:
      "in A Phrygian dominant (hicaz makam) — augmented 2nd interval, eastern feel",
  },
  hicazkar: {
    id: "hicazkar",
    label: "Hicazkar",
    keySignature: "Cm with raised 4th",
    mood: "elegant melancholy, classical",
    sunoHint:
      "in C minor with raised fourth (hicazkar) — Ottoman classical color",
  },
  hüseyni: {
    id: "hüseyni",
    label: "Hüseyni",
    keySignature: "Am",
    mood: "warm, folk-narrative",
    sunoHint:
      "in A minor variant (hüseyni) — natural folk feel, Anatolian rural",
  },
  kürdi: {
    id: "kürdi",
    label: "Kürdi",
    keySignature: "Am natural minor",
    mood: "calm contemplation, modal",
    sunoHint: "in A natural minor (kürdi) — modal, calm narrative",
  },
  nihavend: {
    id: "nihavend",
    label: "Nihavend",
    keySignature: "Cm harmonic minor",
    mood: "western minor, romantic",
    sunoHint:
      "in C minor (nihavend) — close to western harmonic minor, romantic",
  },
  rast: {
    id: "rast",
    label: "Rast",
    keySignature: "G major-like with neutral 7th",
    mood: "stately, dignified, peaceful",
    sunoHint:
      "in G makam Rast — major-like with neutral seventh, dignified mood",
  },
  segah: {
    id: "segah",
    label: "Segah",
    keySignature: "B-flat-ish microtonal",
    mood: "soulful, contemplative",
    sunoHint: "in segah makam — microtonal Bb base, contemplative spiritual",
  },
  saba: {
    id: "saba",
    label: "Saba",
    keySignature: "D minor with diminished 4th",
    mood: "sorrowful, religious",
    sunoHint: "in saba makam — D minor with diminished fourth, deep sorrow",
  },
  muhayyer: {
    id: "muhayyer",
    label: "Muhayyer",
    keySignature: "Am descending",
    mood: "high-register lament",
    sunoHint: "in muhayyer (high register A minor) — soaring lament feel",
  },
  neva: {
    id: "neva",
    label: "Neva",
    keySignature: "D mixolydian-like",
    mood: "balanced, modal",
    sunoHint: "in neva makam — D mixolydian-like, balanced modal feel",
  },
  buselik: {
    id: "buselik",
    label: "Buselik",
    keySignature: "A natural minor",
    mood: "pure minor, classical Ottoman",
    sunoHint: "in buselik (pure A natural minor) — classical Ottoman color",
  },
  acem: {
    id: "acem",
    label: "Acem",
    keySignature: "F major-like",
    mood: "bright, Persian-influenced",
    sunoHint:
      "in acem makam — F major-like with neutral steps, bright Persian-tinged",
  },
  karcığar: {
    id: "karcığar",
    label: "Karcığar",
    keySignature: "A with hicaz cadence",
    mood: "playful, dance-like, mixed",
    sunoHint:
      "in karcığar makam — uşşak base with hicaz cadence, playful dance",
  },
};

// ── Janr Presetleri ──────────────────────────────────────────────────────────

export const GENRES: Record<GenreId, GenrePreset> = {
  arabesk: {
    id: "arabesk",
    label: "Arabesk",
    sunoStyle:
      "Turkish arabesque, dramatic minor-key ballad, string orchestra, electric saz, darbuka, def, melismatic emotional vocal, 1980s production",
    negativeTags: "modern pop, autotune, electronic, anglo, edm, k-pop",
    styleWeight: 0.82,
    weirdnessConstraint: 0.18,
    bpm: [70, 95],
  },
  halk_turku: {
    id: "halk_turku",
    label: "Halk / Türkü",
    sunoStyle:
      "Authentic Anatolian folk türkü, traditional bağlama, kaval, davul, raw vocal with regional ornaments, often aksak rhythm",
    negativeTags: "modern production, electronic, autotune, edm, full pop band",
    styleWeight: 0.88,
    weirdnessConstraint: 0.15,
    bpm: [80, 130],
  },
  tsm: {
    id: "tsm",
    label: "TSM (Sanat Müziği)",
    sunoStyle:
      "Classical Turkish art music, ud, kanun, ney, tanbur, refined ornate vocal, makam-based, slow düyek usul, Ottoman court atmosphere",
    negativeTags: "rock, pop, edm, autotune, modern, electric guitar",
    styleWeight: 0.9,
    weirdnessConstraint: 0.1,
    bpm: [55, 85],
  },
  sehir_pop: {
    id: "sehir_pop",
    label: "Şehir Popu",
    sunoStyle:
      "Turkish urban pop, sophisticated production, modern drum kit, piano, strings, electric guitar accents, occasional bağlama color, melodic Turkish vocal",
    negativeTags: "raw folk, traditional arabesque, anglo pop, k-pop, edm",
    styleWeight: 0.75,
    weirdnessConstraint: 0.25,
    bpm: [85, 115],
  },
  anadolu_rock: {
    id: "anadolu_rock",
    label: "Anadolu Rock",
    sunoStyle:
      "Anadolu rock, fusion of Anatolian folk with rock, distorted electric saz/guitar, bass, drum kit, organ, powerful Turkish vocal with folk inflection",
    negativeTags: "trap, edm, generic pop, country, anglo cliches",
    styleWeight: 0.72,
    weirdnessConstraint: 0.4,
    bpm: [100, 145],
  },
  ilahi_sufi: {
    id: "ilahi_sufi",
    label: "İlahi / Sufi",
    sunoStyle:
      "Turkish Sufi devotional music, ney, bendir, def, tanbur, choir, slow meditative usul, reverent contemplative vocal, spiritual",
    negativeTags: "pop, rock, edm, secular, modern beats, autotune",
    styleWeight: 0.88,
    weirdnessConstraint: 0.12,
    bpm: [55, 80],
  },
  rap: {
    id: "rap",
    label: "Türkçe Rap",
    sunoStyle:
      "Turkish rap hip-hop, modern trap production, 808 bass, hi-hats, dark synth pad, confident Turkish flow with clear diction",
    negativeTags: "anglo rap, k-pop, latin rap, country, generic pop",
    styleWeight: 0.7,
    weirdnessConstraint: 0.3,
    bpm: [120, 160],
  },
  fantezi: {
    id: "fantezi",
    label: "Fantezi",
    sunoStyle:
      "Turkish fantezi crossover, pop and arabesque with folk flavor, bağlama, synth, string section, darbuka, drum kit, dramatic emotional vocal",
    negativeTags: "pure folk, classical TSM, anglo pop, k-pop, edm",
    styleWeight: 0.75,
    weirdnessConstraint: 0.25,
    bpm: [90, 115],
  },
  oyun_havasi: {
    id: "oyun_havasi",
    label: "Oyun Havası",
    sunoStyle:
      "Turkish oyun havası dance music, festive celebratory, klarnet, darbuka, def, bağlama, violin, 9/8 aksak or roman style, often instrumental with shouted interjections",
    negativeTags: "slow ballad, sad, anglo pop, edm, trap",
    styleWeight: 0.78,
    weirdnessConstraint: 0.2,
    bpm: [120, 160],
  },
  ozgun: {
    id: "ozgun",
    label: "Özgün Müzik",
    sunoStyle:
      "Turkish özgün protest folk, acoustic guitar with bağlama, light percussion, sincere narrative male/female vocal, poetic delivery",
    negativeTags: "edm, modern pop, autotune, generic, commercial",
    styleWeight: 0.82,
    weirdnessConstraint: 0.2,
    bpm: [75, 100],
  },
  karadeniz: {
    id: "karadeniz",
    label: "Karadeniz",
    sunoStyle:
      "Black Sea Turkish folk music, kemençe fiddle, tulum bagpipe, davul, fast 7/8 horon dance rhythm, nasal resonant vocals, communal dance energy, Celtic-like folk intensity",
    negativeTags: "slow ballad, pop, electronic, autotune, piano, western rock",
    styleWeight: 0.85,
    weirdnessConstraint: 0.15,
    bpm: [140, 170],
  },
  roman: {
    id: "roman",
    label: "Roman Havası",
    sunoStyle:
      "Romani Thracian dance, virtuosic clarinet lead, syncopated 9/8 aksak, darbuka def percussion, festive wedding energy, Balkan Romani swing, shouted interjections",
    negativeTags: "slow, sad, classical, electronic, piano ballad",
    styleWeight: 0.8,
    weirdnessConstraint: 0.2,
    bpm: [130, 155],
  },
  akustik: {
    id: "akustik",
    label: "Akustik / Unplugged",
    sunoStyle:
      "Turkish acoustic unplugged, stripped-down intimate, acoustic guitar and bağlama, light cajon, warm close-mic vocal, coffeehouse atmosphere, minimal production",
    negativeTags:
      "full band, electronic, heavy production, distortion, autotune, orchestra",
    styleWeight: 0.8,
    weirdnessConstraint: 0.2,
    bpm: [75, 100],
  },
  arabesk_pop: {
    id: "arabesk_pop",
    label: "Arabesk Pop",
    sunoStyle:
      "Turkish arabesk pop crossover, arabesk emotional depth with modern pop production, string section, modern drum kit, bağlama accent, accessible romantic vocal, 2000s polished mix",
    negativeTags: "raw folk, heavy distortion, trap, edm, anglo pop, k-pop",
    styleWeight: 0.75,
    weirdnessConstraint: 0.25,
    bpm: [70, 95],
  },
};

// ── Yardımcılar ──────────────────────────────────────────────────────────────

/** Tüm stil preset'leri (UI chip için) */
export function listArtists(): ArtistPreset[] {
  return Object.values(ARTIST_PRESETS);
}

export function listRegions(): RegionPreset[] {
  return Object.values(REGIONS);
}

export function listMakams(): MakamPreset[] {
  return Object.values(MAKAMS);
}

export function listGenres(): GenrePreset[] {
  return Object.values(GENRES);
}

/** Yöre lehçesini sözlere uygula (basit kelime değişimi) */
export function applyRegionalLehce(text: string, regionId: RegionId): string {
  const region = REGIONS[regionId];
  if (!region) return text;
  let out = text;
  for (const [tr, lehce] of Object.entries(region.lyricsLehce)) {
    const re = new RegExp(`\\b${tr}\\b`, "gi");
    out = out.replace(re, lehce);
  }
  return out;
}

/** Birleşik Suno style string oluştur — stil preset + genre + region + makam */
export function buildSunoStyle(input: {
  artistId?: ArtistPresetId;
  genreId?: GenreId;
  regionId?: RegionId;
  makamId?: MakamId;
  extraTags?: string[];
}): string {
  const parts: string[] = [];
  if (input.artistId) parts.push(ARTIST_PRESETS[input.artistId].sunoStyle);
  else if (input.genreId) parts.push(GENRES[input.genreId].sunoStyle);
  if (input.regionId) {
    const r = REGIONS[input.regionId];
    parts.push(
      `${r.label} regional style, ${r.instruments.join(", ")}, ${r.rhythms.join(" or ")}`,
    );
  }
  if (input.makamId) parts.push(MAKAMS[input.makamId].sunoHint);
  if (input.extraTags?.length) parts.push(...input.extraTags);
  parts.push(TURKISH_QUALITY_MARKERS);
  return parts.filter(Boolean).join(", ");
}

/** Birleşik negative tags — stil preset + genre baseline */
export function buildNegativeTags(input: {
  artistId?: ArtistPresetId;
  genreId?: GenreId;
}): string {
  const parts = [DEFAULT_NEGATIVE_TAGS];
  if (input.artistId) parts.push(ARTIST_PRESETS[input.artistId].negativeTags);
  else if (input.genreId) parts.push(GENRES[input.genreId].negativeTags);
  const unique = new Set(
    parts
      .join(", ")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return Array.from(unique).join(", ");
}

/** Birleşik style weight + weirdness — artist > genre > default */
export function resolveSunoParams(input: {
  artistId?: ArtistPresetId;
  genreId?: GenreId;
}): {
  styleWeight: number;
  weirdnessConstraint: number;
  vocalGender?: "m" | "f";
  bpm?: [number, number];
} {
  if (input.artistId) {
    const a = ARTIST_PRESETS[input.artistId];
    return {
      styleWeight: a.styleWeight,
      weirdnessConstraint: a.weirdnessConstraint,
      vocalGender: a.vocalGender,
      bpm: a.bpm,
    };
  }
  if (input.genreId) {
    const g = GENRES[input.genreId];
    return {
      styleWeight: g.styleWeight,
      weirdnessConstraint: g.weirdnessConstraint,
      bpm: g.bpm,
    };
  }
  return { styleWeight: 0.75, weirdnessConstraint: 0.25 };
}
