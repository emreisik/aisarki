"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { type LucideIcon } from "lucide-react";
import {
  Play,
  Pause,
  Music2,
  Clock3,
  ListMusic,
  ChevronRight,
  X,
  Heart,
  Flower2,
  Shield,
  Users,
  Baby,
  GraduationCap,
  Cake,
  Gem,
  Calendar,
  PartyPopper,
  Star,
  Moon,
  HeartCrack,
  CloudRain,
  Zap,
  Smile,
  Wind,
  Flame,
  Clock,
  Landmark,
  Home,
  Sun,
  Film,
  Coffee,
  Mic2,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";

/* ══════════════════════════════════════════════
   Tip tanımları
══════════════════════════════════════════════ */
interface PromptField {
  key: string;
  label: string;
  placeholder?: string;
  type: "text" | "select";
  options?: string[];
}

interface CategoryItem {
  icon: LucideIcon;
  title: string;
  fields: PromptField[];
  buildPrompt: (v: Record<string, string>) => string;
}

interface CategoryGroup {
  label: string;
  color: string;
  items: CategoryItem[];
}

/* ══════════════════════════════════════════════
   Yardımcı — boş değerleri filtreler
══════════════════════════════════════════════ */
function seg(...parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(", ");
}

/* ══════════════════════════════════════════════
   Kategori verileri
══════════════════════════════════════════════ */
const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Kişiye Özel",
    color: "#f43f5e",
    items: [
      {
        icon: Heart,
        title: "Sevgiliye",
        fields: [
          {
            key: "name",
            label: "Sevgilinin adı",
            placeholder: "Ayşe, Mehmet...",
            type: "text",
          },
          {
            key: "duration",
            label: "Ne kadar süredir berabersiniz?",
            placeholder: "3 yıl, 6 ay...",
            type: "text",
          },
          {
            key: "memory",
            label: "En özel anınız",
            placeholder: "Yağmurda yürüyüş, ilk öpücük...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Romantik", "Tutkulu", "Özlemli", "Neşeli", "Hüzünlü"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `${v.name} adlı sevgilime özel` : "sevgilime özel",
            v.duration && `${v.duration} birlikteliğimizin anısına`,
            v.memory && `"${v.memory}" anımıza ithaf`,
            `${v.mood || "romantik"} duygular anlatan kişisel aşk şarkısı`,
          ),
      },
      {
        icon: Flower2,
        title: "Anneme",
        fields: [
          {
            key: "name",
            label: "Annenizin adı (isteğe bağlı)",
            placeholder: "Fatma, Hatice...",
            type: "text",
          },
          {
            key: "memory",
            label: "Onunla özel bir anı",
            placeholder: "Sabah kahvaltıları, masallar...",
            type: "text",
          },
          {
            key: "message",
            label: "Söylemek istediğiniz şey",
            placeholder: "Teşekkürler, özledim, seni seviyorum...",
            type: "text",
          },
          {
            key: "mood",
            label: "Duygu",
            type: "select",
            options: [
              "Duygusal",
              "Minnettarlık",
              "Özlem",
              "Sevgi",
              "Nostaljik",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `Annem ${v.name} için` : "Annem için",
            v.memory && `"${v.memory}" anısına özel`,
            v.message && `"${v.message}" mesajıyla`,
            `${v.mood || "duygusal"} bir şarkı`,
          ),
      },
      {
        icon: Shield,
        title: "Babama",
        fields: [
          {
            key: "name",
            label: "Babanızın adı (isteğe bağlı)",
            placeholder: "Ali, Mehmet...",
            type: "text",
          },
          {
            key: "quality",
            label: "Onu en çok ne için seviyorsunuz?",
            placeholder: "Çalışkanlığı, sabrı, fedakarlığı...",
            type: "text",
          },
          {
            key: "memory",
            label: "Birlikte özel bir an",
            placeholder: "Balık tutmak, sohbetler...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Saygı & Sevgi",
              "Duygusal",
              "Güçlü & Gururlu",
              "Nostaljik",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `Babam ${v.name} için` : "Babam için",
            v.quality && `${v.quality} anlatan`,
            v.memory && `"${v.memory}" anısına özel`,
            `${v.mood || "saygı ve sevgi dolu"} bir şarkı`,
          ),
      },
      {
        icon: Users,
        title: "Arkadaşıma",
        fields: [
          {
            key: "name",
            label: "Arkadaşının adı",
            placeholder: "Can, Selin...",
            type: "text",
          },
          {
            key: "duration",
            label: "Ne zamandan beri arkadaşsınız?",
            placeholder: "İlkokuldan, 10 yıldır...",
            type: "text",
          },
          {
            key: "memory",
            label: "Birlikte en çılgın anınız",
            placeholder: "Gece macerası, yolculuk...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Neşeli & Enerjik", "Duygusal", "Eğlenceli", "Nostaljik"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `Arkadaşım ${v.name} için` : "En iyi arkadaşım için",
            v.duration && `${v.duration} dostluğumuza özel`,
            v.memory && `"${v.memory}" anımıza ithaf`,
            `${v.mood || "neşeli"} bir dostluk şarkısı`,
          ),
      },
      {
        icon: Baby,
        title: "Bebeğime",
        fields: [
          {
            key: "name",
            label: "Bebeğin adı",
            placeholder: "Defne, Yusuf...",
            type: "text",
          },
          {
            key: "wish",
            label: "Ona ne dilemek istersiniz?",
            placeholder: "Mutluluk, sağlık, başarı...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Ninni & Sakin", "Sevimli & Neşeli", "Duygusal"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `Bebeğim ${v.name} için` : "Bebeğim için",
            v.wish && `${v.wish} dileğiyle`,
            `${v.mood || "ninni tarzında"} yumuşak ve sevgi dolu şarkı`,
          ),
      },
      {
        icon: GraduationCap,
        title: "Öğretmenime",
        fields: [
          {
            key: "name",
            label: "Öğretmenin adı",
            placeholder: "Ayşe Hanım, Murat Bey...",
            type: "text",
          },
          {
            key: "lesson",
            label: "Sizi en çok ne etkiledi?",
            placeholder: "Sabrı, ilgisi, bilgisi...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Teşekkür & Saygı", "Duygusal", "Nostaljik", "Sıcak"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `Öğretmenim ${v.name} için` : "Öğretmenim için",
            v.lesson && `${v.lesson} adına özel`,
            `${v.mood || "teşekkür dolu"} içten bir şarkı`,
          ),
      },
    ],
  },
  {
    label: "Özel Günler",
    color: "#f59e0b",
    items: [
      {
        icon: Cake,
        title: "Doğum Günü",
        fields: [
          {
            key: "name",
            label: "Kimin doğum günü?",
            placeholder: "Ahmet, Zeynep...",
            type: "text",
          },
          {
            key: "age",
            label: "Kaç yaşına giriyor?",
            placeholder: "25, 30...",
            type: "text",
          },
          {
            key: "wish",
            label: "Özel mesajınız",
            placeholder: "Nice yıllara, hep güzel olsun...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Neşeli & Enerjik",
              "Duygusal",
              "Komik & Eğlenceli",
              "Nostaljik",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `${v.name} için doğum günü şarkısı` : "Doğum günü şarkısı",
            v.age && `${v.age}. yaşa özel`,
            v.wish && `"${v.wish}"`,
            `${v.mood || "neşeli"} kutlama şarkısı`,
          ),
      },
      {
        icon: Gem,
        title: "Düğün",
        fields: [
          {
            key: "couple",
            label: "Çiftin isimleri",
            placeholder: "Ahmet & Elif...",
            type: "text",
          },
          {
            key: "story",
            label: "Nasıl tanıştılar? (kısaca)",
            placeholder: "Üniversitede, komşuydular...",
            type: "text",
          },
          {
            key: "wish",
            label: "Onlara dileğiniz",
            placeholder: "Ömür boyu mutluluk...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Romantik", "Neşeli", "Duygusal", "Klasik"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.couple ? `${v.couple} çifti için düğün şarkısı` : "Düğün şarkısı",
            v.story && `${v.story} hikayelerine özel`,
            v.wish && `"${v.wish}" dileğiyle`,
            `${v.mood || "romantik"} ve kutlama dolu`,
          ),
      },
      {
        icon: Calendar,
        title: "Yıl Dönümü",
        fields: [
          {
            key: "name",
            label: "Sevgilinin adı",
            placeholder: "Elif, Ali...",
            type: "text",
          },
          {
            key: "years",
            label: "Kaçıncı yıl dönümü?",
            placeholder: "1., 5., 10...",
            type: "text",
          },
          {
            key: "memory",
            label: "Bu yılın en güzel anı",
            placeholder: "Seyahat, özel gece...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Romantik", "Nostaljik", "Neşeli", "Duygusal"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `${v.name} ile birlikteliğimizin` : "Birlikteliğimizin",
            v.years ? `${v.years}. yıl dönümüne özel` : "yıl dönümüne özel",
            v.memory && `"${v.memory}" anımıza ithaf`,
            `${v.mood || "romantik"} şarkı`,
          ),
      },
      {
        icon: PartyPopper,
        title: "Parti Gecesi",
        fields: [
          {
            key: "occasion",
            label: "Ne kutluyorsunuz?",
            placeholder: "Mezuniyet, terfi, yeni ev...",
            type: "text",
          },
          {
            key: "who",
            label: "Kimler var?",
            placeholder: "Arkadaş grubu, aile...",
            type: "text",
          },
          {
            key: "mood",
            label: "Enerji seviyesi",
            type: "select",
            options: ["Çok Enerjik", "Orta", "Sakin Kutlama"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.occasion ? `${v.occasion} kutlaması için` : "Parti gecesi için",
            v.who && `${v.who} ile birlikte`,
            `${v.mood || "çok enerjik"} dans ettiren şarkı`,
          ),
      },
      {
        icon: Star,
        title: "Bayram",
        fields: [
          {
            key: "type",
            label: "Hangi bayram?",
            type: "select",
            options: ["Ramazan Bayramı", "Kurban Bayramı", "Yeni Yıl", "Diğer"],
          },
          {
            key: "family",
            label: "Kiminle kutluyorsunuz?",
            placeholder: "Ailece, akrabalarla...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Neşeli & Coşkulu",
              "Nostaljik",
              "Sevgi Dolu",
              "Dini & Manevi",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            `${v.type || "Bayram"} için`,
            v.family && `${v.family} ile`,
            `${v.mood || "neşeli"} kutlama şarkısı`,
          ),
      },
      {
        icon: GraduationCap,
        title: "Mezuniyet",
        fields: [
          {
            key: "name",
            label: "Mezun olan kişi",
            placeholder: "Selin, Burak...",
            type: "text",
          },
          {
            key: "school",
            label: "Okul / bölüm",
            placeholder: "Tıp, Boğaziçi Üniversitesi...",
            type: "text",
          },
          {
            key: "future",
            label: "Gelecek hayali",
            placeholder: "Doktor olmak, dünyayı gezmek...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Gurur Verici", "Nostaljik", "Coşkulu", "Duygusal"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name ? `${v.name}'in mezuniyeti için` : "Mezuniyet için",
            v.school && `${v.school}'den`,
            v.future && `${v.future} hayaliyle`,
            `${v.mood || "gurur verici"} bir şarkı`,
          ),
      },
    ],
  },
  {
    label: "Duygular",
    color: "#8b5cf6",
    items: [
      {
        icon: HeartCrack,
        title: "Ayrılık Acısı",
        fields: [
          {
            key: "name",
            label: "Kişinin adı (isteğe bağlı)",
            placeholder: "Adını yazmak istemeyebilirsin...",
            type: "text",
          },
          {
            key: "duration",
            label: "Ne kadar sürdü?",
            placeholder: "2 yıl, 6 ay...",
            type: "text",
          },
          {
            key: "feeling",
            label: "Şu an nasıl hissediyorsun?",
            placeholder: "Boşluk, öfke, özlem...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Derin Hüzün", "Öfke & Acı", "Kabulleniş", "Özlem"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.name
              ? `${v.name} ile ayrılığın ardından`
              : "Bir ayrılığın ardından",
            v.duration && `${v.duration} birlikteliğin sona erişi`,
            v.feeling && `${v.feeling} hissini anlatan`,
            `${v.mood || "derin hüzün"} dolu şarkı`,
          ),
      },
      {
        icon: CloudRain,
        title: "Özlem",
        fields: [
          {
            key: "who",
            label: "Kimi özlüyorsun?",
            placeholder: "Birisini, bir yeri, bir dönemi...",
            type: "text",
          },
          {
            key: "why",
            label: "En çok ne eksik?",
            placeholder: "Sesi, kokusu, birlikte olduğumuz yerler...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Hüzünlü & Derin", "Umutlu", "Kabullenmiş", "Nostaljik"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.who ? `${v.who} için özlem şarkısı` : "Derin bir özlem şarkısı",
            v.why && `${v.why} eksikliğini anlatan`,
            `${v.mood || "hüzünlü"} ve içten şarkı`,
          ),
      },
      {
        icon: Zap,
        title: "Motivasyon",
        fields: [
          {
            key: "goal",
            label: "Hedefin nedir?",
            placeholder: "Sınav, iş, spor, hayat...",
            type: "text",
          },
          {
            key: "obstacle",
            label: "Aşman gereken engel?",
            placeholder: "Korku, tembellik, başarısızlık...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının enerjisi",
            type: "select",
            options: [
              "Sert & Güçlü",
              "Yumuşak & Umutlu",
              "Hip-Hop Enerjisi",
              "Epik & Sinematik",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.goal ? `${v.goal} hedefi için` : "Hedeflere ulaşmak için",
            v.obstacle && `${v.obstacle} engelini aşmayı anlatan`,
            `${v.mood || "güçlü"} motivasyon şarkısı`,
          ),
      },
      {
        icon: Smile,
        title: "Mutluluk",
        fields: [
          {
            key: "reason",
            label: "Neden mutlusun?",
            placeholder: "Güzel bir gün, harika haber, huzur...",
            type: "text",
          },
          {
            key: "with",
            label: "Bu anı kiminle yaşıyorsun?",
            placeholder: "Yalnız, sevdiklerimle...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Neşeli & Dans",
              "Sakin & Huzurlu",
              "Enerjik",
              "Sıcak & İçten",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.reason ? `${v.reason} anını anlatan` : "Mutluluğu anlatan",
            v.with && `${v.with} ile paylaşılan`,
            `${v.mood || "neşeli"} bir şarkı`,
          ),
      },
      {
        icon: Wind,
        title: "Huzur & Sakinlik",
        fields: [
          {
            key: "place",
            label: "Huzur bulduğun yer",
            placeholder: "Deniz kenarı, ev, doğa...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Lo-fi & Sakin",
              "Ambient & Enstrümantal",
              "Akustik & Sıcak",
              "Meditasyon",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.place ? `${v.place} huzurunu anlatan` : "İç huzuru anlatan",
            `${v.mood || "lo-fi sakin"} rahatlatıcı şarkı`,
          ),
      },
      {
        icon: Flame,
        title: "Güç & Öfke",
        fields: [
          {
            key: "reason",
            label: "Bu enerji nereden geliyor?",
            placeholder: "Haksızlık, hayal kırıklığı...",
            type: "text",
          },
          {
            key: "message",
            label: "Söylemek istediğin şey",
            placeholder: "Yılmıyorum, güçlüyüm, hata yaptın...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Rock & Metal", "Hip-Hop Öfke", "Güçlü Pop", "Dramatik"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.reason && `${v.reason} üzerine`,
            v.message ? `"${v.message}" mesajıyla` : "güç ve direnci anlatan",
            `${v.mood || "rock"} tarzı şarkı`,
          ),
      },
      {
        icon: Clock,
        title: "Nostalji",
        fields: [
          {
            key: "era",
            label: "Hangi dönem?",
            placeholder: "Çocukluk, lise yılları, ilk aşk...",
            type: "text",
          },
          {
            key: "memory",
            label: "En güzel anı",
            placeholder: "Yaz tatilleri, o şarkı, o koku...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Hüzünlü Nostaljik",
              "Sıcak & Güzel",
              "Özlemli",
              "Tatlı Acı",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.era ? `${v.era} dönemine özlem` : "Geçmişe özlem",
            v.memory && `"${v.memory}" anısını anlatan`,
            `${v.mood || "nostaljik"} ve duygusal şarkı`,
          ),
      },
    ],
  },
  {
    label: "Türk Kültürü",
    color: "#10b981",
    items: [
      {
        icon: Landmark,
        title: "İstanbul",
        fields: [
          {
            key: "place",
            label: "Favori semt veya yer",
            placeholder: "Boğaz, Kapalıçarşı, Balat...",
            type: "text",
          },
          {
            key: "time",
            label: "Hangi vakti?",
            type: "select",
            options: [
              "Sabah sisi",
              "Gün batımı",
              "Gece",
              "Yaz akşamı",
              "Kış yağmuru",
            ],
          },
          {
            key: "feeling",
            label: "Bu şehir sana ne hissettiriyor?",
            placeholder: "Özgürlük, hüzün, aşk, aidiyet...",
            type: "text",
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.place
              ? `İstanbul'un ${v.place} semtine özel`
              : "İstanbul'a ithaf",
            v.time && `${v.time} vaktinde`,
            v.feeling && `${v.feeling} hissini anlatan`,
            "Türk pop şarkısı",
          ),
      },
      {
        icon: Home,
        title: "Memleket Özlemi",
        fields: [
          {
            key: "city",
            label: "Memleketin neresi?",
            placeholder: "Trabzon, Konya, Gaziantep...",
            type: "text",
          },
          {
            key: "memory",
            label: "En özlediğin şey",
            placeholder: "Annemin yemekleri, sokaklar...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Derin Özlem", "Türk Halk Tarzı", "Arabesk", "Pop"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.city ? `${v.city}'e duyulan özlem` : "Memleket özlemi",
            v.memory && `${v.memory} eksikliğini anlatan`,
            `${v.mood || "derin özlem"} dolu şarkı`,
          ),
      },
      {
        icon: Mic2,
        title: "Arabesk",
        fields: [
          {
            key: "theme",
            label: "Şarkının konusu",
            placeholder: "Kader, ayrılık, yalnızlık...",
            type: "text",
          },
          {
            key: "artist",
            label: "Beğendiğin arabesk sanatçı",
            placeholder: "Orhan Gencebay, İbrahim Tatlıses...",
            type: "text",
          },
          {
            key: "mood",
            label: "Duygu yoğunluğu",
            type: "select",
            options: ["Çok Ağır & Dramatik", "Orta", "Hafif Arabesk"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.theme ? `${v.theme} temalı` : "Kader ve aşk temalı",
            v.artist && `${v.artist} tarzında`,
            `${v.mood || "dramatik"} arabesk şarkı`,
          ),
      },
      {
        icon: MapPin,
        title: "Anadolu",
        fields: [
          {
            key: "region",
            label: "Hangi bölge?",
            placeholder: "Karadeniz, Ege, Doğu Anadolu...",
            type: "text",
          },
          {
            key: "theme",
            label: "Konu",
            placeholder: "Toprak, doğa, gelenekler...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Halk Müziği",
              "Türkü",
              "Modern Anadolu Füzyonu",
              "Bağlama Ağırlıklı",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.region ? `${v.region} bölgesinin ruhu` : "Anadolu'nun ruhu",
            v.theme && `${v.theme} temalı`,
            `${v.mood || "türkü tarzında"} şarkı`,
          ),
      },
      {
        icon: Sun,
        title: "Yaz & Sahil",
        fields: [
          {
            key: "place",
            label: "Hangi yer aklında?",
            placeholder: "Bodrum, Çeşme, Antalya...",
            type: "text",
          },
          {
            key: "with",
            label: "Kiminle?",
            placeholder: "Sevgilimle, arkadaşlarla...",
            type: "text",
          },
          {
            key: "mood",
            label: "Enerji",
            type: "select",
            options: ["Dans & Parti", "Sakin & Dingin", "Romantik", "Nostalji"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.place ? `${v.place}'de yaz tatili` : "Yaz ve sahil",
            v.with && `${v.with} ile`,
            `${v.mood || "neşeli"} Türk pop şarkısı`,
          ),
      },
      {
        icon: Coffee,
        title: "Çay Saati",
        fields: [
          {
            key: "with",
            label: "Kiminle çay içiyorsun?",
            placeholder: "Annemle, arkadaşımla, yalnız...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: [
              "Sıcak & Samimi",
              "Sakin & Dingin",
              "Nostaljik",
              "Hafif Hüzün",
            ],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.with
              ? `${v.with} ile çay sohbetine özel`
              : "Çay saatinin huzurunu anlatan",
            `${v.mood || "sıcak ve samimi"} şarkı`,
          ),
      },
      {
        icon: Film,
        title: "Dizi Müziği",
        fields: [
          {
            key: "genre",
            label: "Dizi türü",
            type: "select",
            options: [
              "Romantik Dram",
              "Aksiyon",
              "Tarihi",
              "Komedi",
              "Gerilim",
            ],
          },
          {
            key: "scene",
            label: "Sahne nasıl?",
            placeholder: "Kavuşma anı, vedalaşma, savaş...",
            type: "text",
          },
          {
            key: "mood",
            label: "Şarkının tonu",
            type: "select",
            options: ["Dramatik & Epik", "Romantik", "Hüzünlü", "Coşkulu"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.genre ? `${v.genre} türü Türk dizisi için` : "Türk dizisi için",
            v.scene && `${v.scene} sahnesine özel`,
            `${v.mood || "dramatik"} fon müziği`,
          ),
      },
    ],
  },
];

/* ══════════════════════════════════════════════
   Kategori başına müzikal yön (Suno için)
══════════════════════════════════════════════ */
const MUSICAL_STYLES: Record<string, string> = {
  Sevgiliye:
    "Turkish romantic pop ballad, warm natural female vocals, acoustic guitar, piano, light strings",
  Anneme:
    "Turkish emotional ballad, tender female voice, acoustic guitar, soft piano, gentle strings",
  Babama:
    "Turkish pop, sincere warm male vocals, acoustic guitar, light percussion, honest tone",
  Arkadaşıma:
    "upbeat Turkish pop, energetic natural vocals, electric guitar, bass, fun and genuine",
  Bebeğime:
    "gentle Turkish lullaby, soft sweet female vocals, acoustic guitar, light piano, tender",
  Öğretmenime:
    "Turkish pop ballad, warm respectful vocals, acoustic guitar, piano, sincere heartfelt",
  "Doğum Günü":
    "cheerful Turkish pop, bright natural vocals, acoustic guitar, brass, festive celebratory",
  Düğün:
    "romantic Turkish wedding ballad, emotional vocals, orchestra, strings, piano, elegant",
  "Yıl Dönümü":
    "Turkish romantic pop, intimate warm vocals, acoustic guitar, piano, nostalgic tender",
  "Parti Gecesi":
    "energetic Turkish dance pop, upbeat expressive vocals, electric guitar, bass, festive",
  Bayram:
    "joyful Turkish folk pop, cheerful natural vocals, bağlama, darbuka, traditional celebratory",
  Mezuniyet:
    "uplifting Turkish pop, proud natural vocals, orchestra, acoustic guitar, triumphant",
  "Ayrılık Acısı":
    "melancholic Turkish ballad, sorrowful authentic female vocals, piano, violin, strings",
  Özlem:
    "Turkish melancholic pop, longing natural vocals, acoustic guitar, violin, bittersweet",
  Motivasyon:
    "Turkish pop rock, powerful passionate vocals, electric guitar, drums, energizing",
  Mutluluk:
    "upbeat Turkish pop, joyful bright vocals, acoustic guitar, light bass, cheerful",
  "Huzur & Sakinlik":
    "Turkish acoustic lo-fi, gentle soft female vocals, acoustic guitar, ambient, peaceful",
  "Güç & Öfke":
    "Turkish rock, intense powerful male vocals, distorted electric guitar, heavy drums, raw",
  Nostalji:
    "nostalgic Turkish pop, warm wistful vocals, acoustic guitar, piano, light strings",
  İstanbul:
    "atmospheric Turkish pop, urban vocals, bağlama meets electric guitar, mystical city",
  "Memleket Özlemi":
    "Turkish folk, heartfelt authentic vocals, bağlama, darbuka, longing rural feeling",
  Arabesk:
    "Turkish arabesk, dramatic passionate male vocals, oud, orchestra, heavy ornamentation",
  Anadolu:
    "Turkish traditional folk, deep authentic vocals, bağlama, kaval, organic Anatolian",
  "Yaz & Sahil":
    "Turkish summer pop, bright cheerful female vocals, guitar, bass, light carefree beats",
  "Çay Saati":
    "Turkish acoustic pop, intimate warm vocals, acoustic guitar, cozy and relaxed",
  "Dizi Müziği":
    "Turkish cinematic score, dramatic emotional orchestra, strings, piano, sweeping",
};

/* ══════════════════════════════════════════════
   Prompt Modal (bottom sheet)
══════════════════════════════════════════════ */
function PromptModal({
  item,
  color,
  onClose,
  onGenerate,
}: {
  item: CategoryItem;
  color: string;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const Icon = item.icon;
  const [values, setValues] = useState<Record<string, string>>({});
  const preview = item.buildPrompt(values);

  const set = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: val }));
  const toggle = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: v[key] === val ? "" : val }));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full md:max-w-lg bg-[#111] rounded-t-3xl md:rounded-3xl border border-[#1e1e1e] max-h-[90vh] flex flex-col">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-[#2a2a2a]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: color + "22" }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <h2 className="text-white font-black text-lg">
              {item.title} Şarkısı
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-[#535353] hover:text-white transition-colors pressable"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {item.fields.map((field) => (
            <div key={field.key}>
              <label className="text-[#a7a7a7] text-xs font-semibold uppercase tracking-widest mb-2 block">
                {field.label}
              </label>
              {field.type === "text" ? (
                <input
                  value={values[field.key] || ""}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#3a3a3a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a3a3a] focus:outline-none transition-colors"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((opt) => {
                    const active = values[field.key] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => toggle(field.key, opt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all pressable border"
                        style={
                          active
                            ? {
                                background: color + "22",
                                borderColor: color + "66",
                                color,
                              }
                            : {
                                background: "#1a1a1a",
                                borderColor: "#2a2a2a",
                                color: "#a7a7a7",
                              }
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Prompt önizleme */}
          {preview && (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#0d0d0d] p-4">
              <p className="text-[#535353] text-[10px] font-bold uppercase tracking-widest mb-1.5">
                Oluşturulacak prompt
              </p>
              <p className="text-[#a7a7a7] text-sm leading-relaxed italic">
                "{preview}"
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 py-4 border-t border-[#1e1e1e]">
          <button
            onClick={() => {
              if (!preview) return;
              const style = MUSICAL_STYLES[item.title];
              const full = style ? `[${style}] ${preview}` : preview;
              onGenerate(full);
            }}
            disabled={!preview}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all pressable disabled:opacity-30"
            style={{
              background: preview ? color : "#1a1a1a",
              color: preview ? "black" : "#535353",
            }}
          >
            {preview ? "Şarkıyı Oluştur" : "Bilgileri doldurun"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Kategori pill
══════════════════════════════════════════════ */
function CategoryPill({
  item,
  color,
  onClick,
}: {
  item: CategoryItem;
  color: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#1e1e1e] hover:border-[#2a2a2a] hover:bg-[#1a1a1a] transition-all pressable"
    >
      <Icon size={14} style={{ color }} className="flex-shrink-0" />
      <span className="text-white text-xs font-semibold whitespace-nowrap">
        {item.title}
      </span>
    </button>
  );
}

/* ── Kategori satırı ── */
function CategoryRow({
  group,
  onSelect,
}: {
  group: CategoryGroup;
  onSelect: (item: CategoryItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5 px-6">
        <p className="text-[#3a3a3a] text-[10px] font-bold uppercase tracking-widest">
          {group.label}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 text-[#3a3a3a] text-[10px] pressable hover:text-[#535353] transition-colors"
        >
          {expanded ? "Kapat" : "Tümü"}
          <ChevronRight
            size={10}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      {expanded ? (
        <div className="px-6 flex flex-wrap gap-2">
          {group.items.map((item) => (
            <CategoryPill
              key={item.title}
              item={item}
              color={group.color}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto scroll-area px-6 pb-0.5">
          {group.items.map((item) => (
            <CategoryPill
              key={item.title}
              item={item}
              color={group.color}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Yardımcı componentler
══════════════════════════════════════════════ */
function fmt(s?: number) {
  if (!s || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function Rail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="px-6 mb-3">
        <h2 className="text-white text-lg font-black">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scroll-area px-6 pb-2">
        {children}
      </div>
    </section>
  );
}

function SongTile({
  song,
  onPlay,
  isPlaying,
}: {
  song: Song;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-[148px] bg-[#141414] hover:bg-[#1a1a1a] rounded-xl p-3 transition-colors text-left group pressable"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#1e1e1e] mb-3">
        {song.imageUrl ? (
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          /> // eslint-disable-line @next/next/no-img-element
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={26} className="text-[#2a2a2a]" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          {isPlaying ? (
            <Pause size={13} fill="black" className="text-black" />
          ) : (
            <Play size={13} fill="black" className="text-black ml-0.5" />
          )}
        </div>
      </div>
      <p
        className={`text-xs font-semibold truncate mb-0.5 ${isPlaying ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      <p className="text-[#535353] text-[11px] truncate">
        {song.style?.split(",")[0] || "AI Müzik"}
      </p>
    </button>
  );
}

function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex-shrink-0 w-[148px] bg-[#141414] hover:bg-[#1a1a1a] rounded-xl p-3 transition-colors group pressable"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#1e1e1e] mb-3">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover"
          /> // eslint-disable-line @next/next/no-img-element
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#450af5] to-[#c4efd9]">
            <ListMusic size={30} className="text-white" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          <Play size={13} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <p className="text-white text-xs font-semibold truncate mb-0.5">
        {playlist.title}
      </p>
      <p className="text-[#535353] text-[11px]">
        {playlist.songCount ?? 0} şarkı
      </p>
    </Link>
  );
}

function TrackRow({
  song,
  index,
  onPlay,
  isPlaying,
}: {
  song: Song;
  index: number;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className="w-full flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-[#ffffff08] transition-colors group text-left pressable"
    >
      <div className="w-7 text-center flex-shrink-0">
        {isPlaying ? (
          <span className="flex items-end justify-center gap-[2px] h-4">
            {[0, 0.15, 0.3].map((d, i) => (
              <span
                key={i}
                className="wave-bar rounded-sm"
                style={{
                  width: "2px",
                  height: "100%",
                  animationDelay: `${d}s`,
                }}
              />
            ))}
          </span>
        ) : (
          <>
            <span className="text-[#535353] text-xs group-hover:hidden">
              {index + 1}
            </span>
            <Play
              size={12}
              fill="white"
              className="text-white hidden group-hover:block mx-auto"
            />
          </>
        )}
      </div>
      <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden bg-[#1e1e1e]">
        {song.imageUrl ? (
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          /> // eslint-disable-line @next/next/no-img-element
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={12} className="text-[#2a2a2a]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
        >
          {song.title}
        </p>
        <p className="text-[#535353] text-xs truncate">
          {song.style?.split(",")[0] || "AI Müzik"}
        </p>
      </div>
      {song.status === "processing" && (
        <span className="w-3.5 h-3.5 border-2 border-[#535353] border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      <span className="text-[#535353] text-xs tabular-nums flex-shrink-0">
        {song.status === "complete" ? fmt(song.duration) : "—"}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════
   Ana sayfa
══════════════════════════════════════════════ */
export default function HomePage() {
  const { playSong, currentSong } = usePlayer();
  const { data: session } = useSession();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [generatedSongs, setGeneratedSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeItem, setActiveItem] = useState<{
    item: CategoryItem;
    color: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => setAllSongs(d.songs || []));
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists || []));
  }, [session]);

  const handleSongsAdded = useCallback((newSongs: Song[]) => {
    if (newSongs.length === 0) {
      setGeneratedSongs((prev) =>
        prev.filter((s) => !s.id.startsWith("temp-")),
      );
      return;
    }
    setGeneratedSongs((prev) => {
      const updated = [...prev];
      newSongs.forEach((ns) => {
        const idx = updated.findIndex((s) => s.id === ns.id);
        if (idx >= 0) updated[idx] = ns;
        else updated.unshift(ns);
      });
      return updated;
    });
  }, []);

  const pollForSongs = useCallback(
    (taskId: string, tempIds: string[]) => {
      let attempts = 0;
      const poll = async () => {
        if (attempts++ >= 40) return;
        try {
          const res = await fetch(`/api/songs?taskId=${taskId}`);
          const data = await res.json();
          if (data.status === "complete" && data.songs?.length > 0) {
            handleSongsAdded(
              data.songs.map((s: Song, i: number) => ({
                ...s,
                id: tempIds[i] || s.id,
              })),
            );
            setAllSongs((prev) => {
              const ids = new Set(prev.map((s) => s.id));
              return [
                ...data.songs.filter((s: Song) => !ids.has(s.id)),
                ...prev,
              ];
            });
          } else {
            setTimeout(poll, 5000);
          }
        } catch {
          setTimeout(poll, 8000);
        }
      };
      setTimeout(poll, 10000);
    },
    [handleSongsAdded],
  );

  const handleGenerate = async (p: string) => {
    const trimmed = p.trim();
    if (!trimmed || loading) return;
    setActiveItem(null);
    setError("");
    setLoading(true);
    const tempSongs: Song[] = [1, 2].map((i) => ({
      id: `temp-${Date.now()}-${i}`,
      title: trimmed.slice(0, 40),
      status: "processing" as const,
      createdAt: new Date().toISOString(),
    }));
    handleSongsAdded(tempSongs);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          customMode: false,
          instrumental: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.data?.taskId) {
        setError(data.error || data.msg || "Hata oluştu");
        handleSongsAdded([]);
        return;
      }
      pollForSongs(
        data.data.taskId,
        tempSongs.map((s) => s.id),
      );
    } catch {
      setError("Bağlantı hatası");
      handleSongsAdded([]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  const moreSongs = allSongs.slice(0, 18);
  const mobilePad = currentSong
    ? "pb-[calc(144px+env(safe-area-inset-bottom,0px))]"
    : "pb-[calc(72px+env(safe-area-inset-bottom,0px))]";

  return (
    <div className={`min-h-full ${mobilePad} md:pb-0`}>
      {/* Modal */}
      {activeItem && (
        <PromptModal
          item={activeItem.item}
          color={activeItem.color}
          onClose={() => setActiveItem(null)}
          onGenerate={handleGenerate}
        />
      )}

      {/* ── Hero ── */}
      <div className="pt-16 md:pt-20 pb-6 bg-[#0a0a0a]">
        <div className="px-6 mb-5">
          <h1 className="text-white text-2xl font-black">Şarkını Yap</h1>
          <p className="text-[#3a3a3a] text-sm mt-0.5">
            Kategori seç, kişiselleştir, oluştur
          </p>
        </div>

        {CATEGORY_GROUPS.map((group) => (
          <CategoryRow
            key={group.label}
            group={group}
            onSelect={(item) => setActiveItem({ item, color: group.color })}
          />
        ))}

        {/* Manuel yazma */}
        <div className="px-6 mt-5">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate(prompt);
              }
            }}
            placeholder="Ya da kendin yaz..."
            rows={2}
            maxLength={500}
            className="w-full bg-[#141414] border border-[#1e1e1e] focus:border-[#2a2a2a] rounded-2xl px-4 py-3.5 text-white text-sm placeholder-[#2a2a2a] resize-none focus:outline-none transition-colors"
          />
          {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          <button
            onClick={() => handleGenerate(prompt)}
            disabled={loading || !prompt.trim()}
            className="mt-2 w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all pressable disabled:opacity-30"
            style={{
              background: loading ? "#141414" : "#1db954",
              color: loading ? "#535353" : "black",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#535353]/40 border-t-[#535353] rounded-full animate-spin" />
                Oluşturuluyor...
              </span>
            ) : (
              "Şarkı Oluştur"
            )}
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] pb-8">
        {generatedSongs.length > 0 && (
          <section className="mb-8 px-6 pt-6">
            <h2 className="text-white text-lg font-black mb-3">
              Oluşturulanlar
            </h2>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 px-4 pb-2 border-b border-[#141414] mb-1">
                <span className="w-7 text-center text-[#2a2a2a] text-xs">
                  #
                </span>
                <span className="w-9 flex-shrink-0" />
                <span className="flex-1 text-[#2a2a2a] text-xs uppercase tracking-widest">
                  Başlık
                </span>
                <Clock3 size={12} className="text-[#2a2a2a]" />
              </div>
              {generatedSongs.map((song, i) => (
                <TrackRow
                  key={song.id}
                  song={song}
                  index={i}
                  onPlay={() => playSong(song, generatedSongs)}
                  isPlaying={currentSong?.id === song.id}
                />
              ))}
            </div>
          </section>
        )}

        {playlists.length > 0 && (
          <Rail title="Çalma Listelerim">
            {playlists.map((pl) => (
              <PlaylistTile key={pl.id} playlist={pl} />
            ))}
          </Rail>
        )}

        {moreSongs.length > 0 && (
          <Rail title="Son Şarkılar">
            {moreSongs.map((song) => (
              <SongTile
                key={song.id}
                song={song}
                onPlay={() => playSong(song, allSongs)}
                isPlaying={currentSong?.id === song.id}
              />
            ))}
          </Rail>
        )}

        {allSongs.length === 0 && generatedSongs.length === 0 && (
          <div className="px-6 pt-6">
            <div className="rounded-2xl border border-[#141414] p-8 text-center">
              <Music2 size={28} className="text-[#1e1e1e] mx-auto mb-3" />
              <p className="text-white text-base font-bold mb-1">
                İlk şarkını oluştur
              </p>
              <p className="text-[#3a3a3a] text-sm">
                Yukarıdan bir kategori seç
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
