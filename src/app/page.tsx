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
import { useRouter } from "next/navigation";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSession } from "next-auth/react";
import SongCard from "@/components/SongCard";
import { useLikedIds } from "@/hooks/useLikedIds";

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
            key: "mood",
            label: "Duygu yoğunluğu",
            type: "select",
            options: ["Çok Ağır & Dramatik", "Orta", "Hafif Arabesk"],
          },
        ],
        buildPrompt: (v) =>
          seg(
            v.theme ? `${v.theme} temalı` : "Kader ve aşk temalı",
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
  const [closing, setClosing] = useState(false);
  const preview = item.buildPrompt(values);

  const textFields = item.fields.filter((f) => f.type === "text");
  const hasInput =
    textFields.length === 0 || textFields.some((f) => values[f.key]?.trim());

  const set = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: val }));
  const toggle = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: v[key] === val ? "" : val }));

  const dismiss = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop — blur + fade */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-md ${closing ? "backdrop-exit" : "backdrop-enter"}`}
        onClick={dismiss}
      />

      {/* ── Full-height native sheet ── */}
      <div
        className={`relative z-10 w-full h-[92vh] bg-[#0c0c0c] rounded-t-[28px] flex flex-col ${closing ? "sheet-exit" : "sheet-enter"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-[5px] rounded-full bg-[#333]" />
        </div>

        {/* ── Header — icon hero + title ── */}
        <div className="flex flex-col items-center pt-3 pb-5 px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{
              background: `linear-gradient(135deg, ${color}30, ${color}10)`,
              boxShadow: `0 8px 32px ${color}15`,
            }}
          >
            <Icon size={28} style={{ color }} />
          </div>
          <h2 className="text-white text-xl font-black tracking-tight">
            {item.title}
          </h2>
          <p className="text-[#666] text-xs mt-0.5">
            Bilgileri doldur, şarkını oluşturalım
          </p>
        </div>

        {/* ── Form — scrollable ── */}
        <div className="flex-1 overflow-y-auto scroll-area px-5 pb-4 space-y-5">
          {item.fields.map((field) => (
            <div key={field.key}>
              <label className="text-[#888] text-[11px] font-semibold uppercase tracking-widest mb-2 block pl-1">
                {field.label}
              </label>
              {field.type === "text" ? (
                <input
                  value={values[field.key] || ""}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-[#161616] rounded-2xl px-4 py-3.5 text-white text-[15px] placeholder-[#333] focus:outline-none focus:ring-1 transition-shadow"
                  style={{ focusRingColor: color } as React.CSSProperties}
                />
              ) : (
                /* iOS segmented-control tarzı seçim */
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((opt) => {
                    const active = values[field.key] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => toggle(field.key, opt)}
                        className="px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all pressable active:scale-95"
                        style={
                          active
                            ? {
                                background: color,
                                color: "#000",
                                boxShadow: `0 4px 14px ${color}40`,
                              }
                            : {
                                background: "#161616",
                                color: "#888",
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

          {/* Prompt önizleme — native card */}
          {preview && (
            <div
              className="rounded-2xl p-4 mt-2"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}15`,
              }}
            >
              <p className="text-[#555] text-[10px] font-bold uppercase tracking-widest mb-1.5">
                Oluşturulacak
              </p>
              <p className="text-[#aaa] text-[13px] leading-relaxed">
                {preview}
              </p>
            </div>
          )}
        </div>

        {/* ── CTA — safe area destekli ── */}
        <div className="px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          <button
            onClick={() => {
              if (!preview) return;
              const style = MUSICAL_STYLES[item.title];
              const full = style ? `[${style}] ${preview}` : preview;
              onGenerate(full);
            }}
            disabled={!preview || !hasInput}
            className="w-full py-4 rounded-2xl font-black text-[15px] tracking-wide transition-all pressable active:scale-[0.98] disabled:opacity-25"
            style={{
              background: preview && hasInput ? color : "#1a1a1a",
              color: preview && hasInput ? "#000" : "#444",
              boxShadow: preview && hasInput ? `0 6px 24px ${color}35` : "none",
            }}
          >
            {hasInput ? "Şarkıyı Oluştur" : "Bilgileri doldurun"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Kategori kartı — native app tarzı büyük kutular
══════════════════════════════════════════════ */
function CategoryCard({
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
      className="flex-shrink-0 w-[110px] aspect-square rounded-2xl flex flex-col items-center justify-center gap-2.5 pressable transition-transform active:scale-95"
      style={{
        background: `linear-gradient(145deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}20`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: `${color}20` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <span className="text-white/90 text-[11px] font-semibold leading-tight text-center px-2">
        {item.title}
      </span>
    </button>
  );
}

/* ── Kategori carousel — yatay snap scroll ── */
function CategoryCarousel({
  groups,
  onSelect,
}: {
  groups: CategoryGroup[];
  onSelect: (item: CategoryItem, color: string) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const group = groups[activeTab];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto scroll-area px-5 mb-4">
        {groups.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveTab(i)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all pressable"
            style={
              i === activeTab
                ? { background: g.color, color: "#000" }
                : { background: "#ffffff08", color: "#888" }
            }
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Kartlar — snap scroll */}
      <div className="flex gap-3 overflow-x-auto scroll-area px-5 pb-2 snap-x snap-mandatory">
        {group.items.map((item) => (
          <div key={item.title} className="snap-start">
            <CategoryCard
              item={item}
              color={group.color}
              onClick={() => onSelect(item, group.color)}
            />
          </div>
        ))}
      </div>
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
        {song.style?.split(",")[0] || "Hubeya"}
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

function LikedShortcutTile() {
  return (
    <Link
      href="/liked"
      className="flex-shrink-0 w-[148px] bg-[#141414] hover:bg-[#1a1a1a] rounded-xl p-3 transition-colors group pressable"
    >
      <div
        className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #e11d48 0%, #7e22ce 100%)",
        }}
      >
        <Heart size={40} fill="white" className="text-white drop-shadow" />
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
          <Play size={13} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <p className="text-white text-xs font-semibold truncate mb-0.5">
        Beğenilen Şarkılar
      </p>
      <p className="text-[#535353] text-[11px]">Çalma listesi</p>
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
          {song.style?.split(",")[0] || "Hubeya"}
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
  const { playSong, currentSong, setShowGate } = usePlayer();
  const { data: session } = useSession();
  const { likedIds, toggleLiked } = useLikedIds();
  const router = useRouter();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedCat, setSelectedCat] = useState<{
    item: CategoryItem;
    color: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/all-songs")
      .then((r) => r.json())
      .then((d) => {
        setAllSongs(d.songs || []);
      });
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists || []));
  }, [session?.user?.id]);

  const moreSongs = allSongs.slice(0, 18);

  // ── Discover verisi ──
  const [discoverSongs, setDiscoverSongs] = useState<Song[]>([]);
  useEffect(() => {
    fetch("/api/discover-songs")
      .then((r) => r.json())
      .then((d) => setDiscoverSongs(d.songs || []))
      .catch(() => {});
  }, []);

  // ── Takip feed'i (login user'ın takip ettikleri) ──
  const [feedSongs, setFeedSongs] = useState<Song[]>([]);
  useEffect(() => {
    if (!session?.user?.id) {
      setFeedSongs([]);
      return;
    }
    fetch("/api/feed?limit=15")
      .then((r) => r.json())
      .then((d) => setFeedSongs(d.songs || []))
      .catch(() => setFeedSongs([]));
  }, [session?.user?.id]);

  // ── Son dinlediklerin ──
  const [recentPlays, setRecentPlays] = useState<Song[]>([]);
  useEffect(() => {
    let sid = "";
    try {
      sid = localStorage.getItem("hubeya_sid") ?? "";
    } catch {
      /* storage yok */
    }
    const headers: HeadersInit = {};
    if (!session?.user && sid) headers["x-session-id"] = sid;
    fetch("/api/recent-plays?limit=10", { headers })
      .then((r) => r.json())
      .then((d) => setRecentPlays(d.songs || []))
      .catch(() => {});
  }, [session?.user?.id]);

  // ── Öneriler (Spotify "Sizin için") ──
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [recsPersonalized, setRecsPersonalized] = useState(false);
  useEffect(() => {
    fetch("/api/recommendations?limit=15")
      .then((r) => r.json())
      .then((d) => {
        setRecommendations(d.songs || []);
        setRecsPersonalized(Boolean(d.personalized));
      })
      .catch(() => {});
  }, [session?.user?.id]);

  // Saatlik selamlama
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return "İyi geceler";
    if (h < 12) return "Günaydın";
    if (h < 17) return "İyi günler";
    if (h < 21) return "İyi akşamlar";
    return "İyi geceler";
  })();

  // Discover şarkılarını sanatçıya göre grupla
  const artistGroups = (() => {
    const map = new Map<
      string,
      { name: string; username: string; songs: Song[] }
    >();
    discoverSongs.forEach((s) => {
      if (!s.creator) return;
      const key = s.creator.id;
      if (!map.has(key)) {
        map.set(key, {
          name: s.creator.name,
          username: s.creator.username,
          songs: [],
        });
      }
      map.get(key)!.songs.push(s);
    });
    return Array.from(map.values())
      .filter((g) => g.songs.length >= 2)
      .slice(0, 4);
  })();

  return (
    <div className="min-h-full">
      {/* ── Şarkını Oluştur — native app section ── */}
      <div
        className="pt-4 pb-6"
        style={{
          background:
            "linear-gradient(180deg, #1a0e2e 0%, #0e1a2e 50%, #0a0a0a 100%)",
        }}
      >
        {/* Başlık + serbest oluşturma linki */}
        <div className="px-5 mb-5">
          <p className="text-[#a78bfa] text-[10px] font-bold uppercase tracking-[0.15em]">
            {greeting}
          </p>
          <div className="flex items-end justify-between mt-1">
            <h1 className="text-white text-[22px] font-black leading-tight">
              Şarkını oluştur
            </h1>
            <Link
              href="/create"
              className="text-[#a78bfa] text-xs font-semibold pressable"
            >
              Serbest mod &rarr;
            </Link>
          </div>
        </div>

        {/* Kategori carousel */}
        <CategoryCarousel
          groups={CATEGORY_GROUPS}
          onSelect={(item, color) => setSelectedCat({ item, color })}
        />
      </div>

      {/* ── Kategori prompt modal ── */}
      {selectedCat && (
        <PromptModal
          item={selectedCat.item}
          color={selectedCat.color}
          onClose={() => setSelectedCat(null)}
          onGenerate={(prompt) => {
            setSelectedCat(null);
            router.push(`/create?prompt=${encodeURIComponent(prompt)}`);
          }}
        />
      )}

      <div className="bg-[#0a0a0a] pb-8">
        {session?.user && (
          <Rail title="Çalma Listelerim">
            <LikedShortcutTile />
            {playlists.map((pl) => (
              <PlaylistTile key={pl.id} playlist={pl} />
            ))}
          </Rail>
        )}

        {session?.user && feedSongs.length > 0 && (
          <section className="mb-8">
            <div className="px-6 mb-2">
              <h2 className="text-white text-lg font-black">
                Takip ettiklerinden
              </h2>
            </div>
            <div className="px-2">
              {feedSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  variant="row"
                  onPlay={(s) => playSong(s, feedSongs)}
                  isPlaying={currentSong?.id === song.id}
                  liked={likedIds.has(song.id)}
                  onToggleLike={toggleLiked}
                />
              ))}
            </div>
          </section>
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

        {allSongs.length === 0 && (
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

      {/* ══════════════════════════════════════════════
          Son dinlediklerin
      ══════════════════════════════════════════════ */}
      {recentPlays.length > 0 && (
        <div className="bg-[#121212] pt-2">
          <DiscoverRail
            title="Son dinlediklerin"
            songs={recentPlays}
            onPlay={(s) => playSong(s, recentPlays)}
            currentSong={currentSong}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Kişiye özel öneriler (Spotify "Sizin için öneriler")
      ══════════════════════════════════════════════ */}
      {recommendations.length > 0 && (
        <div className="bg-[#121212] pt-2">
          <DiscoverRail
            title={recsPersonalized ? "Sana özel" : "Popüler öneriler"}
            songs={recommendations}
            onPlay={(s) => playSong(s, recommendations)}
            currentSong={currentSong}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Spotify-tarzı keşif bölümleri
      ══════════════════════════════════════════════ */}
      {discoverSongs.length > 0 && (
        <div className="bg-[#121212] pb-10">
          {/* Selamlama + hızlı erişim */}
          <DiscoverGreeting
            greeting={greeting}
            songs={discoverSongs.slice(0, 6)}
            onPlay={(s) => playSong(s, discoverSongs)}
            currentSong={currentSong}
          />

          {/* Sanatçı grupları */}
          {artistGroups.map((group) => (
            <DiscoverRail
              key={group.username}
              title={`${group.name} Şarkıları`}
              songs={group.songs}
              onPlay={(s) => playSong(s, discoverSongs)}
              currentSong={currentSong}
              artistUsername={group.username}
            />
          ))}

          {/* Bugün için önerilenler */}
          <DiscoverRail
            title="Bugün için önerilenler"
            songs={discoverSongs.slice(0, 12)}
            onPlay={(s) => playSong(s, discoverSongs)}
            currentSong={currentSong}
          />

          {/* Yeni çıkanlar */}
          <DiscoverRail
            title="Yeni çıkanlar"
            songs={[...discoverSongs].reverse().slice(0, 12)}
            onPlay={(s) => playSong(s, discoverSongs)}
            currentSong={currentSong}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Selamlama + hızlı erişim grid'i
══════════════════════════════════════════════ */
function DiscoverGreeting({
  greeting,
  songs,
  onPlay,
  currentSong,
}: {
  greeting: string;
  songs: Song[];
  onPlay: (s: Song) => void;
  currentSong: Song | null;
}) {
  return (
    <div className="px-4 pt-8 pb-4">
      <h2 className="text-white text-2xl font-black mb-4 px-2">{greeting}</h2>
      <div className="grid grid-cols-2 gap-2">
        {songs.map((song) => (
          <button
            key={song.id}
            onClick={() => onPlay(song)}
            className={`flex items-center gap-3 rounded-md overflow-hidden pressable transition-colors ${
              currentSong?.id === song.id
                ? "bg-[#ffffff20]"
                : "bg-[#ffffff12] hover:bg-[#ffffff1e]"
            }`}
          >
            {/* Cover */}
            <div className="w-14 h-14 flex-shrink-0 overflow-hidden bg-[#282828]">
              {song.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={song.imageUrl}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 size={20} className="text-[#535353]" />
                </div>
              )}
            </div>
            <span
              className={`text-sm font-bold truncate pr-2 text-left ${
                currentSong?.id === song.id ? "text-[#1db954]" : "text-white"
              }`}
            >
              {song.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Yatay scroll rail
══════════════════════════════════════════════ */
function DiscoverRail({
  title,
  songs,
  onPlay,
  currentSong,
  artistUsername,
}: {
  title: string;
  songs: Song[];
  onPlay: (s: Song) => void;
  currentSong: Song | null;
  artistUsername?: string;
}) {
  return (
    <section className="py-6">
      <div className="flex items-center justify-between px-6 mb-3">
        <h2 className="text-white text-xl font-black">{title}</h2>
        {artistUsername && (
          <Link
            href={`/profile/${artistUsername}`}
            className="text-[#a7a7a7] text-sm font-semibold hover:text-white transition-colors pressable"
          >
            Tümünü gör
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto scroll-area px-6 pb-1">
        {songs.map((song) => (
          <DiscoverCard
            key={song.id}
            song={song}
            onPlay={() => onPlay(song)}
            isActive={currentSong?.id === song.id}
          />
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   Kart — yatay scroll içinde
══════════════════════════════════════════════ */
function DiscoverCard({
  song,
  onPlay,
  isActive,
}: {
  song: Song;
  onPlay: () => void;
  isActive: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-36 pressable group text-left"
    >
      {/* Cover */}
      <div className="w-36 h-36 rounded-md overflow-hidden bg-[#282828] mb-3 relative">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={32} className="text-[#535353]" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform">
            <Play size={18} fill="black" className="text-black ml-0.5" />
          </div>
        </div>
      </div>
      <p
        className={`text-sm font-semibold truncate ${isActive ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      {song.creator && (
        <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
          {song.creator.name}
        </p>
      )}
    </button>
  );
}
