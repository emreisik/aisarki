/**
 * Türkiye'ye özel "kişisel şarkı" occasion (vesile) sistemi.
 *
 * Kullanıcı doğal dilde yazıyor: "Serra için 30. yaş doğum günü şarkısı,
 * kahve seviyor, mavi gözleri var". Claude bunu structured intent'e çeviriyor:
 * { occasion: "dogum_gunu", isim: "Serra", yas: 30, detay: "..." }.
 *
 * Her occasion'ın hazır lyrics blueprint'i, default genre/mood/vibe'ı var.
 * Kullanıcı bunlarla uğraşmıyor — sadece doğal dilde yazıyor.
 */

import type { GenreId } from "@/lib/turkishMusicKB";
import type { WizardMoodId } from "@/types";

export type OccasionId =
  | "dogum_gunu"
  | "yil_donumu"
  | "dugun_nisan"
  | "anneler_gunu"
  | "babalar_gunu"
  | "sevgililer_gunu"
  | "bebek_hosgeldin"
  | "ninni"
  | "mezuniyet"
  | "asker_ugurlama"
  | "is_terfi"
  | "emeklilik"
  | "yeni_is"
  | "anma_vefat"
  | "eski_dost"
  | "evcil_hayvan_anisi"
  | "sunnet"
  | "kina_gecesi"
  | "hac_ugurlama"
  | "mevlid"
  | "roast"
  | "dogum_gunu_saka"
  | "arkadaslik"
  | "ozel_aniya_ozel"
  | "genel";

export interface OccasionTemplate {
  id: OccasionId;
  label: string;
  icon: string;
  /** Anasayfa ipucu kartında gösterilecek örnek prompt — tıklayınca textarea'ya gider */
  sampleHint: string;
  /** Default genre — kullanıcı override edebilir ama bu en uygun olan */
  defaultGenre: GenreId;
  defaultMood: WizardMoodId;
  /** Suno style'ına eklenecek vibe tarifi — instrument + duygu */
  defaultVibe: string;
  /**
   * Lyrics yazılırken Claude'a verilecek özel context — bu occasion'ın
   * gelenek/duygusal yapısını anlatır
   */
  lyricsContext: string;
  /**
   * Lyrics structure — Claude'un takip edeceği bölüm planı
   * (Verse 1 ne anlatsın, Chorus'ta ne tekrarlansın, vb.)
   */
  lyricsBlueprint: string;
}

export const OCCASIONS: Record<OccasionId, OccasionTemplate> = {
  dogum_gunu: {
    id: "dogum_gunu",
    label: "Doğum Günü",
    icon: "🎂",
    sampleHint:
      "Serra için 30. yaş doğum günü şarkısı, kahve sever, mavi gözleri var",
    defaultGenre: "sehir_pop",
    defaultMood: "coskulu",
    defaultVibe:
      "warm acoustic guitar, gentle piano, light strings, intimate sing-along, joyful but heartfelt",
    lyricsContext:
      "Türk pop geleneğinde içten, samimi bir doğum günü şarkısı. Sade ve duygusal. Kişinin adı ve özel detayları önemli. Klişeden kaçın — gerçek bir hatıra/an üzerinden anlat.",
    lyricsBlueprint:
      "[Verse 1] Kişinin tanıtımı/ortak hatıra (kullanıcı detayları kullan)\n[Chorus] 'İyi ki doğdun ${isim}' birebir tekrar — akılda kalıcı, kısa\n[Verse 2] O kişinin bir özelliği/sevdiği şey üzerinden duyguyu derinleştir\n[Chorus] tekrar\n[Bridge] Dilek/temenni\n[Outro] Adıyla kapanış",
  },
  yil_donumu: {
    id: "yil_donumu",
    label: "Evlilik / İlişki Yıldönümü",
    icon: "💍",
    sampleHint:
      "Eşim Ayşe için 5. evlilik yıldönümü şarkısı, ilk tanıştığımız kafe, çocuklarımızla yaşadıklarımız",
    defaultGenre: "akustik",
    defaultMood: "romantik",
    defaultVibe:
      "warm acoustic guitar, soft piano, layered strings, intimate ballad, nostalgic warmth",
    lyricsContext:
      "İki kişinin birlikte yaşadığı yıllar üzerine bir şarkı. Ortak hatıralar, küçük detaylar, geçen zamanın kıymeti. Kuru bir 'seni seviyorum' değil — somut anlar.",
    lyricsBlueprint:
      "[Verse 1] İlk tanışma/başlangıç sahnesi\n[Verse 2] Ortak hatıralar (kullanıcı detayı)\n[Chorus] 'Yıllar geçti ama' tarzı zaman temalı hook + sevgilinin adı\n[Bridge] Şimdiye kadar gelinen yol — 'iyi ki sen'\n[Outro] Geleceğe dilek",
  },
  dugun_nisan: {
    id: "dugun_nisan",
    label: "Düğün / Nişan",
    icon: "👰",
    sampleHint:
      "Ali ve Selin'in düğün şarkısı, üniversitede tanışmışlar, romantik ve mutlu",
    defaultGenre: "akustik",
    defaultMood: "romantik",
    defaultVibe:
      "lush romantic strings, warm acoustic guitar, soft piano, wedding ballad, building emotional climax",
    lyricsContext:
      "İki kişinin birleşmesini kutlayan, romantik ve umutlu bir şarkı. İsimleri mutlaka geçsin. Bir hayat birleşiyor — ciddiyet ve neşe karışımı.",
    lyricsBlueprint:
      "[Verse 1] Tanışma hikayesi (kullanıcı detayı)\n[Verse 2] Bu güne nasıl gelindi\n[Chorus] İki ismin tekrarı — '${isim1} ve ${isim2}'\n[Bridge] Sonsuza kadar tema, dramatik zirve\n[Outro] Yeni başlangıç dileği",
  },
  anneler_gunu: {
    id: "anneler_gunu",
    label: "Anneler Günü",
    icon: "👩",
    sampleHint:
      "Annem Fatma için Anneler Günü şarkısı, her sabah çay demlerdi, en iyi yemekleri o yapardı",
    defaultGenre: "fantezi",
    defaultMood: "ozlem",
    defaultVibe:
      "warm strings, gentle piano, classical Turkish nostalgic ballad, deep emotional warmth",
    lyricsContext:
      "Anneye derin minnet, küçük detaylarla anılan bir hayat. Türk kültüründe anne özel — fedakarlık, sıcaklık, ev hissi.",
    lyricsBlueprint:
      "[Verse 1] Çocukluk hatırası — somut bir an (kullanıcı detayı)\n[Verse 2] Bugüne kadar yapılanların kıymeti\n[Chorus] 'Anne' kelimesi tekrar — minnet ve sevgi\n[Bridge] Söylenmemiş söz / pişmanlık / sevgi itirafı\n[Outro] Sıcak teşekkür",
  },
  babalar_gunu: {
    id: "babalar_gunu",
    label: "Babalar Günü",
    icon: "👨",
    sampleHint:
      "Babam için Babalar Günü şarkısı, balık tutmayı öğretti, sessizdi ama hep yanımdaydı",
    defaultGenre: "akustik",
    defaultMood: "huzunlu",
    defaultVibe:
      "acoustic guitar, soft strings, restrained intimate, deep gratitude tone",
    lyricsContext:
      "Babaya minnet — Türk kültüründe babalar genelde sessiz ama varlıkları büyük. Sözle değil eylemle anlatılan sevgi. Detaylar üzerinden gerçeklik.",
    lyricsBlueprint:
      "[Verse 1] Babanın bir hareketi/öğrettiği şey (kullanıcı detayı)\n[Verse 2] O zaman anlaşılmayan, şimdi kıymeti bilinen\n[Chorus] 'Baba' tekrarı, kısa ama yoğun\n[Bridge] Söylenmemiş 'teşekkür ederim'\n[Outro] Sıcak kapanış",
  },
  sevgililer_gunu: {
    id: "sevgililer_gunu",
    label: "Sevgililer Günü",
    icon: "❤️",
    sampleHint:
      "Sevgilim Burak için Sevgililer Günü şarkısı, beni güldürmesi, kahvaltı yapmamız",
    defaultGenre: "sehir_pop",
    defaultMood: "romantik",
    defaultVibe:
      "warm romantic pop, acoustic guitar, soft beat, intimate and playful",
    lyricsContext:
      "Modern, samimi bir aşk şarkısı. Klişe değil — küçük günlük anlar. Sevgilinin adı geçsin.",
    lyricsBlueprint:
      "[Verse 1] Günlük küçük bir an (kahvaltı, kahve, sokakta yürüyüş)\n[Chorus] Adın tekrarı + 'sen' duygusu\n[Verse 2] Onsuz hayat nasıldı / şimdi nasıl\n[Bridge] Söylemek istediğin tek söz\n[Outro] Sıcak kapanış",
  },
  bebek_hosgeldin: {
    id: "bebek_hosgeldin",
    label: "Bebek Hoşgeldin",
    icon: "👶",
    sampleHint:
      "Yeni doğan kızım Defne için hoşgeldin şarkısı, küçücük elleri, ilk gülüşü",
    defaultGenre: "akustik",
    defaultMood: "huzurlu",
    defaultVibe:
      "soft acoustic guitar, gentle piano, music box bells, tender lullaby tone",
    lyricsContext:
      "Yeni gelen bir hayata sıcak karşılama. Sade, naif, sevgi dolu. Bebeğin adı, ailenin sevinci.",
    lyricsBlueprint:
      "[Verse 1] Bebek geldi — küçük detay (parmaklar, gözler)\n[Chorus] 'Hoşgeldin ${isim}' — yumuşak\n[Verse 2] Aile hissi, etrafındaki sevgi\n[Outro] Dilekler",
  },
  ninni: {
    id: "ninni",
    label: "Ninni",
    icon: "🌙",
    sampleHint: "Bebeğim Ela için ninni, yumuşak ve uyutucu",
    defaultGenre: "akustik",
    defaultMood: "huzurlu",
    defaultVibe:
      "music box, soft piano, gentle acoustic guitar, slow tempo lullaby, dreamy atmosphere",
    lyricsContext:
      "Geleneksel Türk ninni hissi — uyut, sakinleştir. Tekrarlı, yumuşak. Çocuğun adı, anne/baba sesi.",
    lyricsBlueprint:
      "[Verse 1] Gece, sessizlik, yumuşak imgeler\n[Chorus] Tekrarlı ninni hook — 'uyu ${isim} uyu'\n[Verse 2] Rüyalar, sabah dileği\n[Outro] Çok yumuşak fade",
  },
  mezuniyet: {
    id: "mezuniyet",
    label: "Mezuniyet",
    icon: "🎓",
    sampleHint:
      "Kardeşim Mert'in üniversite mezuniyeti için, yıllarca emek verdi",
    defaultGenre: "sehir_pop",
    defaultMood: "coskulu",
    defaultVibe:
      "uplifting pop, building drums, anthemic chorus, hopeful and proud",
    lyricsContext:
      "Bir başarının sonu, yeni bir başlangıç. Gurur, umut, cesaret. Kişinin adı + emek + gelecek dilekleri.",
    lyricsBlueprint:
      "[Verse 1] Geride kalan yıllar — emek\n[Verse 2] Bu güne gelen yol\n[Chorus] '${isim} başardın' — anthemic\n[Bridge] Bundan sonrası — yeni ufuk\n[Outro] Cesaret dileği",
  },
  asker_ugurlama: {
    id: "asker_ugurlama",
    label: "Asker Uğurlama",
    icon: "🪖",
    sampleHint: "Oğlum Mehmet'in asker uğurlama şarkısı, sağ salim dönsün",
    defaultGenre: "halk_turku",
    defaultMood: "ozlem",
    defaultVibe:
      "Turkish folk, bağlama saz, davul, halay rhythm, traditional male vocal, mournful but proud",
    lyricsContext:
      "Türk geleneğinde asker uğurlama özel — vatan, anne, dönüş. Hüzün ve gurur birlikte. Türkü tarzı uygun.",
    lyricsBlueprint:
      "[Verse 1] Vedalaşma sahnesi — anne/baba/sevgili\n[Verse 2] Yolculuk, vatan teması\n[Chorus] 'Sağ salim dön' tekrarı\n[Bridge] Bekleyen aile\n[Outro] Dua",
  },
  is_terfi: {
    id: "is_terfi",
    label: "İş / Terfi / Patron",
    icon: "💼",
    sampleHint: "Patronum Ahmet Bey'in 10. yıl iş şarkısı, takıma destek olur",
    defaultGenre: "sehir_pop",
    defaultMood: "coskulu",
    defaultVibe:
      "uplifting modern pop, acoustic + soft electronic, professional warm tone",
    lyricsContext:
      "İş hayatında bir başarı/jübile/teşekkür. Profesyonel ama içten.",
    lyricsBlueprint:
      "[Verse 1] Geçen yıllar — birlikte yapılanlar\n[Verse 2] Karakter/liderlik özellikleri\n[Chorus] Adı + minnet\n[Bridge] Önümüzdeki dönem\n[Outro] Tebrik",
  },
  anma_vefat: {
    id: "anma_vefat",
    label: "Anma / Vefat",
    icon: "🕊️",
    sampleHint:
      "Rahmetli dedem Mehmet için anma şarkısı, 5 yıl önce kaybettik, çok özlüyoruz",
    defaultGenre: "fantezi",
    defaultMood: "huzunlu",
    defaultVibe:
      "soft strings, gentle piano, restrained ney flute, deep mournful warmth, no celebration",
    lyricsContext:
      "Vefat etmiş bir yakını anma. Hüzün ama saygıyla. Ölüm değil yaşamış olduğu hayat anlatılır.",
    lyricsBlueprint:
      "[Verse 1] Onsuz nasıl bir dünya\n[Verse 2] Bıraktığı izler — somut bir an\n[Chorus] Adı + 'unutmadık'\n[Bridge] Onun bize öğrettiği\n[Outro] Saygı, dua",
  },
  arkadaslik: {
    id: "arkadaslik",
    label: "Arkadaşlık",
    icon: "🤝",
    sampleHint:
      "En yakın arkadaşım Onur'a şarkı, lise sıralarından beri, bana hep destek olur",
    defaultGenre: "akustik",
    defaultMood: "nostaljik",
    defaultVibe:
      "warm acoustic, indie folk, sing-along chorus, friendship anthem",
    lyricsContext:
      "Uzun zamanlık dostluk — yıllar, anılar, küçük şakalar. Resmi değil, samimi.",
    lyricsBlueprint:
      "[Verse 1] Tanışma/lise hatırası\n[Verse 2] Birlikte yaşananlar\n[Chorus] Dost adı tekrarı — 'kardeşim'\n[Bridge] Sırrımız/şakamız\n[Outro] 'Hep var ol'",
  },
  ozel_aniya_ozel: {
    id: "ozel_aniya_ozel",
    label: "Özel Bir An",
    icon: "✨",
    sampleHint:
      "İlk evimizi aldığımız günü anlatan şarkı, eşim ve ben birlikte boyadık duvarları",
    defaultGenre: "akustik",
    defaultMood: "nostaljik",
    defaultVibe: "warm acoustic, intimate, story-telling, gentle build",
    lyricsContext:
      "Hayatın özel bir anını anlatan şarkı. Tek bir sahne, küçük detaylar, duygu.",
    lyricsBlueprint:
      "[Verse 1] O sahnenin başlangıcı\n[Verse 2] Detayları\n[Chorus] 'O gün' tekrarı\n[Bridge] Şimdi ne hissediyoruz\n[Outro] Hatıra olarak kalsın",
  },
  emeklilik: {
    id: "emeklilik",
    label: "Emeklilik",
    icon: "🎖️",
    sampleHint:
      "Babam Hasan'ın 35 yıl bankacılık sonrası emeklilik şarkısı, hep dürüst çalıştı",
    defaultGenre: "sehir_pop",
    defaultMood: "nostaljik",
    defaultVibe:
      "warm orchestral pop, soft piano, light strings, dignified celebratory tone",
    lyricsContext:
      "Uzun yılların ardından emeklilik — bir kariyerin onurla bitirilmesi. Geçen yılları kıymetle anan, geleceği rahat dileyen bir ton. Saygı + hafif nostalji.",
    lyricsBlueprint:
      "[Verse 1] Geçen yılların kısa özeti — emek\n[Verse 2] Bıraktığı izler — meslektaşları, yetiştirdikleri\n[Chorus] Adı + 'sen başardın'\n[Bridge] Yeni dönem — huzur, aile\n[Outro] Sıcak tebrik",
  },
  yeni_is: {
    id: "yeni_is",
    label: "Yeni İş",
    icon: "🚀",
    sampleHint:
      "Kardeşim Ece'nin yeni işine başlarken motivasyon şarkısı, ilk gün heyecanı",
    defaultGenre: "sehir_pop",
    defaultMood: "coskulu",
    defaultVibe:
      "uplifting modern pop, building drums, bright synths, energetic hopeful",
    lyricsContext:
      "Yeni bir yola çıkış — heyecan, hafif kaygı, umut. Cesaretlendirici, motive edici. Klişeden uzak.",
    lyricsBlueprint:
      "[Verse 1] İlk gün, kapı açıldı\n[Verse 2] Geride bıraktıkların — emek\n[Chorus] Adı + 'sen yaparsın'\n[Bridge] Korkma, sen hazırsın\n[Outro] Cesaret",
  },
  eski_dost: {
    id: "eski_dost",
    label: "Eski Dost",
    icon: "📞",
    sampleHint:
      "Yıllar önce kaybettiğim çocukluk arkadaşım Caner için, hâlâ özlüyorum",
    defaultGenre: "akustik",
    defaultMood: "nostaljik",
    defaultVibe:
      "warm acoustic guitar, soft piano, melancholic strings, intimate longing",
    lyricsContext:
      "Yolu ayrılmış eski bir dost — kavga değil sadece zaman. Pişmanlık + sıcak hatıralar. 'Neredesin' duygusu.",
    lyricsBlueprint:
      "[Verse 1] Eski bir hatıra — küçük detay\n[Verse 2] Şimdi nasıl yaşıyoruz, ayrı\n[Chorus] Adı + 'nerelerdesin'\n[Bridge] Söylenmemiş 'özledim'\n[Outro] Hâlâ kapım açık",
  },
  evcil_hayvan_anisi: {
    id: "evcil_hayvan_anisi",
    label: "Evcil Hayvan Anısı",
    icon: "🐾",
    sampleHint:
      "Köpeğim Pamuk için anma şarkısı, 12 yıl beraberdik, geçen ay kaybettim",
    defaultGenre: "akustik",
    defaultMood: "huzunlu",
    defaultVibe:
      "tender acoustic guitar, soft piano, restrained strings, gentle mournful warmth",
    lyricsContext:
      "Kaybedilen evcil hayvana saygıyla anma. Sade, çok duygusal. Hayvanın küçük alışkanlıkları, beraber yaşananlar. İnsana ne kattığı.",
    lyricsBlueprint:
      "[Verse 1] İlk geliş — yavruyken\n[Verse 2] Beraber yaşananlar — küçük alışkanlık\n[Chorus] Adı + 'unutmadım'\n[Bridge] Bana ne öğrettin\n[Outro] 'Hep yanımdasın'",
  },
  sunnet: {
    id: "sunnet",
    label: "Sünnet",
    icon: "✂️",
    sampleHint: "Oğlum Yusuf'un sünnet düğünü için, prensim, koca adam oldu",
    defaultGenre: "halk_turku",
    defaultMood: "coskulu",
    defaultVibe:
      "Turkish wedding folk, davul zurna intro, joyful bağlama, celebratory traditional",
    lyricsContext:
      "Türk geleneğinde sünnet özel kutlama — çocuk büyüdü, erkek oldu. Aile sevinci, davul zurna. Joyful + traditional.",
    lyricsBlueprint:
      "[Verse 1] Çocuğum büyüdü, bugün özel\n[Verse 2] Aile etrafında, bayrak gibi\n[Chorus] '${isim} prensim' — neşeli\n[Bridge] Sağlıkla büyü dileği\n[Outro] Aile duası",
  },
  kina_gecesi: {
    id: "kina_gecesi",
    label: "Kına Gecesi",
    icon: "🌹",
    sampleHint: "Ablam Ayşe'nin kına gecesi için, evden ayrılışı, anneme veda",
    defaultGenre: "halk_turku",
    defaultMood: "ozlem",
    defaultVibe:
      "Turkish folk, def percussion, kanun, female vocal, traditional bittersweet wedding eve",
    lyricsContext:
      "Kına gecesi — Türk geleneğinde gelin alma öncesi duygulu gece. Anneye veda, baba evinden ayrılış. Hüzün + sevinç. Geleneksel.",
    lyricsBlueprint:
      "[Verse 1] Baba evi, anne kucağı\n[Verse 2] Çocukluktan bugüne\n[Chorus] '${isim}'in eli kınalı' — geleneksel\n[Bridge] Anneye 'ağlama'\n[Outro] Hayırlı yolculuk",
  },
  hac_ugurlama: {
    id: "hac_ugurlama",
    label: "Hac Uğurlama",
    icon: "🕋",
    sampleHint:
      "Babam hac yolculuğuna çıkıyor, Mekke'ye uğurlama şarkısı, dua dolu",
    defaultGenre: "ilahi_sufi",
    defaultMood: "huzurlu",
    defaultVibe:
      "spiritual ney flute, soft kanun, restrained male vocal, sacred reverent atmosphere",
    lyricsContext:
      "Hacı adayını uğurlama — kutsal yolculuk. Saygı, dua, manevi duygu. İlahi/sufi tarzı uygun.",
    lyricsBlueprint:
      "[Verse 1] Yolculuk başlıyor — Kabe'ye\n[Verse 2] Ailenin duası, bekleyiş\n[Chorus] Hacı + adı, kabul olsun duası\n[Bridge] Manevi temizlik teması\n[Outro] Sağ salim dön duası",
  },
  mevlid: {
    id: "mevlid",
    label: "Mevlid / Hatim",
    icon: "📿",
    sampleHint: "Vefat eden dedem için mevlid programı, manevi anma şarkısı",
    defaultGenre: "ilahi_sufi",
    defaultMood: "huzurlu",
    defaultVibe:
      "ney flute, soft kanun, restrained classical Turkish religious tone, deeply reverent",
    lyricsContext:
      "Mevlid/hatim — manevi anma. Saygı, dua, sevgi. Hüzün ama umut. İlahi tarzı.",
    lyricsBlueprint:
      "[Verse 1] Onun ruhuna saygıyla\n[Verse 2] Bıraktığı manevi miras\n[Chorus] Adı + 'rahmet'\n[Bridge] Ailenin duası\n[Outro] Allah rahmet eylesin",
  },
  roast: {
    id: "roast",
    label: "Roast / Şaka",
    icon: "🔥",
    sampleHint:
      "En yakın arkadaşım Cem'e roast şarkısı, hep geç gelir, en sevdiği şey döner",
    defaultGenre: "rap",
    defaultMood: "isyankar",
    defaultVibe:
      "comedic Turkish rap, punchy beat, playful diss-track style, fun energetic",
    lyricsContext:
      "Yakın arkadaşa şaka/roast şarkısı — sevgi içeren mizahi. Onun komik yanları, alışkanlıkları. Kötülük yok, gülmece var.",
    lyricsBlueprint:
      "[Verse 1] İlk darbe — komik bir alışkanlık\n[Hook] Adı + roast hook (komik tekrar)\n[Verse 2] İkinci darbe — başka komik şey\n[Hook] tekrar\n[Bridge] 'Ama seni seviyoruz' twist\n[Outro] Gülmeli kapanış",
  },
  dogum_gunu_saka: {
    id: "dogum_gunu_saka",
    label: "Doğum Günü Şakası",
    icon: "🎈",
    sampleHint:
      "Patronum Ali Bey'in 50. yaşı için şakacı doğum günü şarkısı, herkesi kıskandırır",
    defaultGenre: "sehir_pop",
    defaultMood: "coskulu",
    defaultVibe:
      "playful upbeat pop, bouncy rhythm, comedic vocals, party celebration",
    lyricsContext:
      "Doğum günü ama mizahi — yaşı ile dalga, komik özellikler. Sevgi dolu mizah, hakaret yok.",
    lyricsBlueprint:
      "[Verse 1] Yaşı geldi, durum komik\n[Chorus] '${isim} ${yas} oldu' — komik tekrar\n[Verse 2] Diğer yaş gerçekleri (mizahi)\n[Bridge] 'Ama hâlâ gençsin' twist\n[Outro] Gülmeli kutlama",
  },
  genel: {
    id: "genel",
    label: "Genel",
    icon: "🎵",
    sampleHint: "Hayata dair, umutlu bir şarkı",
    defaultGenre: "sehir_pop",
    defaultMood: "huzurlu",
    defaultVibe: "modern Turkish pop, accessible, contemporary production",
    lyricsContext:
      "Belirli bir occasion'ı olmayan genel bir Türkçe şarkı. Kullanıcı detaylarına göre özelleştir.",
    lyricsBlueprint:
      "[Verse 1] Tema kuruluşu\n[Chorus] Akılda kalıcı hook\n[Verse 2] Tema derinleşmesi\n[Bridge] Duygusal zirve\n[Outro] Kapanış",
  },
};

/**
 * Anasayfa ipucu kartları için seçilen 8 occasion (en sık kullanılanlar).
 * Her birinin sampleHint'i textarea'ya tıklayınca yapışır.
 */
export const HERO_HINT_OCCASIONS: OccasionId[] = [
  "dogum_gunu",
  "anneler_gunu",
  "yil_donumu",
  "babalar_gunu",
  "sevgililer_gunu",
  "bebek_hosgeldin",
  "asker_ugurlama",
  "ninni",
];

/**
 * Anasayfa sekmeli vitrini için kategori grupları.
 * Her kategori altında ilgili occasion'lar listelenir.
 */
export const OCCASION_CATEGORIES: Array<{
  id: string;
  label: string;
  icon: string;
  occasions: OccasionId[];
}> = [
  {
    id: "aile",
    label: "Aile",
    icon: "👨‍👩‍👧",
    occasions: [
      "anneler_gunu",
      "babalar_gunu",
      "bebek_hosgeldin",
      "ninni",
      "arkadaslik",
    ],
  },
  {
    id: "romantik",
    label: "Romantik",
    icon: "❤️",
    occasions: ["sevgililer_gunu", "yil_donumu", "dugun_nisan", "kina_gecesi"],
  },
  {
    id: "kutlama",
    label: "Kutlama",
    icon: "🎉",
    occasions: ["dogum_gunu", "mezuniyet", "is_terfi", "emeklilik", "yeni_is"],
  },
  {
    id: "kultur",
    label: "Kültür",
    icon: "🇹🇷",
    occasions: ["asker_ugurlama", "sunnet", "hac_ugurlama", "mevlid"],
  },
  {
    id: "anma",
    label: "Anma",
    icon: "🕊️",
    occasions: ["anma_vefat", "eski_dost", "evcil_hayvan_anisi"],
  },
  {
    id: "eglence",
    label: "Eğlence",
    icon: "🔥",
    occasions: ["roast", "dogum_gunu_saka", "ozel_aniya_ozel"],
  },
];

/**
 * Claude'a kullanıcının doğal dilini structured intent'e çevirten system prompt.
 * Output her zaman valid JSON — strict şema.
 */
export const INTENT_EXTRACTION_SYSTEM_PROMPT = `Sen bir kullanıcı niyet analizcisisin. Türkçe yazılmış şarkı isteğinden structured intent çıkarırsın.

Mevcut occasion ID'leri:
- dogum_gunu (doğum günü, yaş)
- yil_donumu (evlilik yıldönümü, ilişki yıldönümü)
- dugun_nisan (düğün, nişan)
- anneler_gunu (anneler günü, anne)
- babalar_gunu (babalar günü, baba)
- sevgililer_gunu (sevgililer günü, sevgili)
- bebek_hosgeldin (yeni doğan, bebek hoşgeldin)
- ninni (ninni, uyu)
- mezuniyet (okul mezuniyet, başarı)
- asker_ugurlama (asker, askere uğurlama)
- is_terfi (iş, patron, kariyer, jübile)
- emeklilik (emeklilik, kariyer sonu, jübile)
- yeni_is (yeni iş, ilk gün, kariyer başlangıcı)
- anma_vefat (vefat, anma, rahmetli)
- eski_dost (yolu ayrılmış arkadaş, kayıp arkadaşlık)
- evcil_hayvan_anisi (kedi köpek kuş anma, kayıp evcil hayvan)
- sunnet (sünnet düğünü, oğlan çocuğu sünnet)
- kina_gecesi (kına gecesi, gelin alma öncesi)
- hac_ugurlama (hac, umre, kutsal yolculuk)
- mevlid (mevlid, hatim, manevi anma)
- roast (roast, şaka, troll, mizahi diss)
- dogum_gunu_saka (mizahi doğum günü, yaş şakası)
- arkadaslik (dostluk, arkadaş)
- ozel_aniya_ozel (özel an, hatıra)
- genel (yukarıdakilere uymuyorsa)

Mevcut tarz/genre ID'leri (kullanıcı yazısından çıkarsa):
- sehir_pop (modern pop, türk pop)
- akustik (akustik, gitar, sade)
- halk_turku (türkü, halk müziği, anadolu)
- arabesk (arabesk, dramatik, klasik arabesk)
- ilahi_sufi (ilahi, sufi, dini)
- fantezi (fantezi, duygusal)
- doksanlar_pop (90'lar)
- rap (rap, hip-hop)

ÇIKTI: SADECE valid JSON. Hiçbir açıklama, markdown veya extra metin EKLEME.

Şema:
{
  "occasion": "<occasion_id>",
  "isim": "<şarkı kime ithaf — null olabilir>",
  "ikinci_isim": "<düğün gibi 2. isim varsa — null olabilir>",
  "iliski": "<eş, sevgili, anne, baba, çocuk, kardeş, arkadaş, patron, dede, nine — null olabilir>",
  "yas": <sayı veya null>,
  "detay": "<kullanıcının verdiği özel detaylar/anılar — null olabilir>",
  "duygu_tonu": "<huzunlu, romantik, coskulu, ozlem, nostaljik, huzurlu, isyankar — kullanıcı yazısından sezerek seç>",
  "onerilen_genre": "<genre_id veya null — kullanıcı tarz belirtmediyse null bırak, occasion default'u kullanılır>"
}

Örnek 1:
Girdi: "Serra için 30. yaş doğum günü şarkısı, kahve sever, mavi gözleri var"
Çıktı:
{"occasion":"dogum_gunu","isim":"Serra","ikinci_isim":null,"iliski":null,"yas":30,"detay":"kahve sever, mavi gözleri var","duygu_tonu":"coskulu","onerilen_genre":null}

Örnek 2:
Girdi: "Annem Fatma için Anneler Günü, her sabah çay demlerdi"
Çıktı:
{"occasion":"anneler_gunu","isim":"Fatma","ikinci_isim":null,"iliski":"anne","yas":null,"detay":"her sabah çay demlerdi","duygu_tonu":"ozlem","onerilen_genre":null}

Örnek 3:
Girdi: "Memleket özlemi türküsü, gurbet hüznü"
Çıktı:
{"occasion":"genel","isim":null,"ikinci_isim":null,"iliski":null,"yas":null,"detay":"memleket özlemi, gurbet hüznü","duygu_tonu":"ozlem","onerilen_genre":"halk_turku"}`;
