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
   Yardımcı componentler — minimal app design
══════════════════════════════════════════════ */

/* ── Yatay scroll section ── */
function Section({
  title,
  children,
  href,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 className="text-white text-[17px] font-bold">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-[#888] text-[12px] font-semibold pressable"
          >
            Tümü
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto scroll-area px-5 pb-1">
        {children}
      </div>
    </section>
  );
}

/* ── Şarkı kartı — minimal, temiz ── */
function SongCard2({
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
      className="flex-shrink-0 w-[130px] text-left pressable"
    >
      <div className="w-[130px] h-[130px] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2 relative">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={24} className="text-[#333]" />
          </div>
        )}
        {isPlaying && (
          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1db954] flex items-center justify-center">
            <span className="flex items-end justify-center gap-[1.5px] h-2.5">
              {[0, 0.12, 0.24].map((d, k) => (
                <span
                  key={k}
                  className="wave-bar"
                  style={{
                    width: "2px",
                    height: "100%",
                    animationDelay: `${d}s`,
                  }}
                />
              ))}
            </span>
          </div>
        )}
      </div>
      <p
        className={`text-[13px] font-semibold truncate ${isPlaying ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      <p className="text-[#666] text-[11px] truncate mt-0.5">
        {song.creator?.name || song.style?.split(",")[0] || "Hubeya"}
      </p>
    </button>
  );
}

/* ── Playlist kartı — minimal ── */
function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex-shrink-0 w-[130px] pressable"
    >
      <div className="w-[130px] h-[130px] rounded-lg overflow-hidden bg-[#1a1a1a] mb-2">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#450af5] to-[#c4efd9]">
            <ListMusic size={24} className="text-white/80" />
          </div>
        )}
      </div>
      <p className="text-[13px] font-semibold text-white truncate">
        {playlist.title}
      </p>
      <p className="text-[#666] text-[11px] mt-0.5">
        {playlist.songCount ?? 0} şarkı
      </p>
    </Link>
  );
}

/* ── Beğenilenler kısayol kartı ── */
function LikedCard() {
  return (
    <Link href="/liked" className="flex-shrink-0 w-[130px] pressable">
      <div
        className="w-[130px] h-[130px] rounded-lg overflow-hidden mb-2 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #e11d48, #7e22ce)" }}
      >
        <Heart size={32} fill="white" className="text-white" />
      </div>
      <p className="text-[13px] font-semibold text-white truncate">
        Beğenilenler
      </p>
      <p className="text-[#666] text-[11px] mt-0.5">Çalma listesi</p>
    </Link>
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
    <div className="min-h-full bg-[#0a0a0a]">
      {/* ── Üst: Selamlama + Oluştur ── */}
      <div className="pt-4 pb-2 px-5">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-[22px] font-bold">{greeting}</h1>
          <Link
            href="/create"
            className="text-[13px] text-[#b3b3b3] font-medium pressable"
          >
            Serbest mod
          </Link>
        </div>
      </div>

      {/* ── Hızlı erişim grid — Spotify tarzı ── */}
      {discoverSongs.length > 0 && (
        <div className="px-4 pt-2 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {discoverSongs.slice(0, 4).map((song) => {
              const active = currentSong?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() => playSong(song, discoverSongs)}
                  className={`flex items-center gap-3 h-[48px] rounded overflow-hidden pressable ${
                    active ? "bg-[#ffffff18]" : "bg-[#ffffff0a]"
                  }`}
                >
                  <div className="w-[48px] h-[48px] flex-shrink-0 overflow-hidden bg-[#1a1a1a]">
                    {song.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={16} className="text-[#333]" />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-semibold truncate pr-3 ${active ? "text-[#1db954]" : "text-white"}`}
                  >
                    {song.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Kategori carousel ── */}
      <div className="pb-4">
        <div className="px-5 mb-3">
          <h2 className="text-white text-[17px] font-bold">Şarkını oluştur</h2>
        </div>
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

      {/* ── Kitaplık ── */}
      {session?.user && (
        <Section title="Kitaplığın" href="/playlists">
          <LikedCard />
          {playlists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} />
          ))}
        </Section>
      )}

      {/* ── Son dinlediklerin ── */}
      {recentPlays.length > 0 && (
        <Section title="Son dinlediklerin">
          {recentPlays.map((song) => (
            <SongCard2
              key={song.id}
              song={song}
              onPlay={() => playSong(song, recentPlays)}
              isPlaying={currentSong?.id === song.id}
            />
          ))}
        </Section>
      )}

      {/* ── Son şarkılar ── */}
      {moreSongs.length > 0 && (
        <Section title="Son eklenenler">
          {moreSongs.slice(0, 12).map((song) => (
            <SongCard2
              key={song.id}
              song={song}
              onPlay={() => playSong(song, allSongs)}
              isPlaying={currentSong?.id === song.id}
            />
          ))}
        </Section>
      )}

      {/* ── Öneriler ── */}
      {recommendations.length > 0 && (
        <Section title={recsPersonalized ? "Sana özel" : "Popüler"}>
          {recommendations.slice(0, 12).map((song) => (
            <SongCard2
              key={song.id}
              song={song}
              onPlay={() => playSong(song, recommendations)}
              isPlaying={currentSong?.id === song.id}
            />
          ))}
        </Section>
      )}

      {/* ── Takip feed ── */}
      {session?.user && feedSongs.length > 0 && (
        <Section title="Takip ettiklerinden">
          {feedSongs.map((song) => (
            <SongCard2
              key={song.id}
              song={song}
              onPlay={() => playSong(song, feedSongs)}
              isPlaying={currentSong?.id === song.id}
            />
          ))}
        </Section>
      )}

      {/* ── Sanatçı grupları ── */}
      {artistGroups.map((group) => (
        <Section
          key={group.username}
          title={group.name}
          href={`/profile/${group.username}`}
        >
          {group.songs.map((song) => (
            <SongCard2
              key={song.id}
              song={song}
              onPlay={() => playSong(song, discoverSongs)}
              isPlaying={currentSong?.id === song.id}
            />
          ))}
        </Section>
      ))}

      {/* ── Boş durum ── */}
      {allSongs.length === 0 && discoverSongs.length === 0 && (
        <div className="px-5 pt-8">
          <div className="rounded-2xl bg-[#111] p-8 text-center">
            <Music2 size={28} className="text-[#333] mx-auto mb-3" />
            <p className="text-white text-base font-bold mb-1">
              İlk şarkını oluştur
            </p>
            <p className="text-[#666] text-sm">Yukarıdan bir kategori seç</p>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
