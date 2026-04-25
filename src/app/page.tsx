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
  Plus,
  Shuffle,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { useUpload } from "@/contexts/UploadContext";
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
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const fields = item.fields;
  const currentField = fields[step];
  const isLastStep = step === fields.length - 1;
  const totalSteps = fields.length;

  const set = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: val }));

  const dismiss = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  const handleNext = () => {
    if (isLastStep) {
      const style = MUSICAL_STYLES[item.title] || "";
      const description = item.buildPrompt(values);
      const full = style ? `${style}, ${description}` : description;
      onGenerate(full);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const canNext =
    currentField?.type === "select" ? !!values[currentField.key] : true; // text alanları opsiyonel — boş geçilebilir

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${closing ? "backdrop-exit" : "backdrop-enter"}`}
        onClick={dismiss}
      />

      <div
        className={`relative z-10 w-full bg-[#181818] rounded-t-[16px] flex flex-col ${closing ? "sheet-exit" : "sheet-enter"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-[10px] pb-[6px]">
          <div className="w-[36px] h-[4px] rounded-full bg-[#333]" />
        </div>

        {/* Header — kompakt */}
        <div className="flex items-center justify-between px-[20px] pb-[16px]">
          <div className="flex items-center gap-[12px]">
            <div
              className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center"
              style={{ background: `${color}20` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <h2 className="text-white text-[16px] font-bold">{item.title}</h2>
              <p className="text-[#666] text-[12px]">
                Adım {step + 1}/{totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="w-[32px] h-[32px] rounded-full bg-[#2a2a2a] flex items-center justify-center pressable"
          >
            <X size={14} className="text-[#999]" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-[20px] pb-[20px]">
          <div className="h-[3px] bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((step + 1) / totalSteps) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>

        {/* Soru alanı — tek soru */}
        <div className="px-[20px] pb-[24px]">
          <p className="text-white text-[18px] font-bold mb-[16px]">
            {currentField?.label}
          </p>

          {currentField?.type === "text" ? (
            <input
              autoFocus
              value={values[currentField.key] || ""}
              onChange={(e) => set(currentField.key, e.target.value)}
              placeholder={currentField.placeholder}
              className="w-full h-[52px] bg-[#2a2a2a] rounded-[8px] px-[16px] text-white text-[16px] placeholder-[#555] focus:outline-none border border-transparent focus:border-[#1db954] transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNext();
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-[8px]">
              {currentField?.options?.map((opt) => {
                const active = values[currentField.key] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      set(currentField.key, opt);
                      // Seçince otomatik ilerle
                      setTimeout(() => {
                        if (isLastStep) {
                          const style = MUSICAL_STYLES[item.title] || "";
                          const description = item.buildPrompt({
                            ...values,
                            [currentField.key]: opt,
                          });
                          const full = style
                            ? `${style}, ${description}`
                            : description;
                          onGenerate(full);
                        } else {
                          setStep((s) => s + 1);
                        }
                      }, 200);
                    }}
                    className="px-[16px] py-[12px] rounded-[8px] text-[14px] font-semibold transition-all pressable"
                    style={
                      active
                        ? {
                            background: color,
                            color: "#000",
                            boxShadow: `0 4px 16px ${color}40`,
                          }
                        : { background: "#2a2a2a", color: "#ddd" }
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Alt butonlar */}
        <div className="flex gap-[8px] px-[20px] pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="h-[48px] px-[20px] rounded-[8px] bg-[#2a2a2a] text-white text-[14px] font-semibold pressable"
            >
              Geri
            </button>
          )}
          {currentField?.type === "text" && (
            <button
              onClick={handleNext}
              className="flex-1 h-[48px] rounded-[8px] text-[14px] font-bold pressable transition-colors"
              style={{
                background: isLastStep ? color : "#1db954",
                color: "#000",
              }}
            >
              {isLastStep
                ? "Şarkıyı Oluştur"
                : values[currentField.key]?.trim()
                  ? "Devam"
                  : "Atla"}
            </button>
          )}
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
    <section className="mb-[24px]">
      <div className="flex items-baseline justify-between px-[16px] mb-[12px]">
        {href && (
          <Link
            href={href}
            className="text-[#b3b3b3] text-[12px] font-bold uppercase tracking-wide pressable hover:text-white transition-colors"
          >
            Tümünü göster
          </Link>
        )}
      </div>
      <div className="flex gap-[16px] overflow-x-auto scroll-area px-[16px] pb-[4px]">
        {children}
      </div>
    </section>
  );
}

/* ── Şarkı kartı — hover play, aktifken her zaman görünür ── */
function SongCard2({
  song,
  onPlay,
  isActive,
  isPlaying,
}: {
  song: Song;
  onPlay: () => void;
  isActive: boolean;
  isPlaying: boolean;
}) {
  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-[156px] text-left pressable group"
    >
      <div className="w-[156px] h-[156px] rounded-[8px] overflow-hidden bg-[#282828] mb-[8px] relative shadow-lg shadow-black/40">
        {song.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={32} className="text-[#7f7f7f]" />
          </div>
        )}
        {/* Spotify play button — yeşil, sağ alt, hover animasyonu */}
        <div
          className={`absolute bottom-[8px] right-[8px] w-[48px] h-[48px] rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl shadow-black/50 transition-all duration-300 ${
            isActive
              ? "opacity-100 translate-y-0"
              : "opacity-0 group-hover:opacity-100 translate-y-[8px] group-hover:translate-y-0"
          }`}
        >
          {isActive && isPlaying ? (
            <Pause size={20} fill="black" className="text-black" />
          ) : (
            <Play size={20} fill="black" className="text-black ml-[2px]" />
          )}
        </div>
      </div>
      <p
        className={`text-[14px] font-bold truncate leading-[20px] ${isActive ? "text-[#1db954]" : "text-white"}`}
      >
        {song.title}
      </p>
      <p className="text-[#b3b3b3] text-[11px] truncate mt-[4px] leading-[16px]">
        {song.creator?.name || song.style?.split(",")[0] || "Rifmo"}
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
  const { playSong, currentSong, playing, setShowGate } = usePlayer();
  const { data: session } = useSession();
  const { likedIds, toggleLiked } = useLikedIds();
  const router = useRouter();
  const toast = useToast();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedCat, setSelectedCat] = useState<{
    item: CategoryItem;
    color: string;
  } | null>(null);
  const [inlineInput, setInlineInput] = useState("");
  const [heroPrompt, setHeroPrompt] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const { setPending: setPendingUpload, openRecord } = useUpload();
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const handleHeroFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUpload({ file, startedAt: Date.now() });
    e.target.value = "";
    router.push("/create");
  };

  // Dinamik placeholder
  const PLACEHOLDERS = [
    "Annem için duygusal bir şarkı yap",
    "Sevgilime romantik akustik şarkı",
    "Doğum günü kutlama şarkısı, neşeli pop",
    "Babama teşekkür şarkısı, sıcak ton",
    "En yakın arkadaşıma enerjik dans şarkısı",
    "Düğünümüz için özel romantik slow",
    "İstanbul gecelerini anlatan arabesk",
    "Motivasyon veren Türkçe rap",
    "Bebeğim için ninni, sakin ve huzurlu",
    "Mezuniyet kutlaması, gururlu ve coşkulu",
    "Memleket özlemi, halk müziği tarzında",
    "Yaz tatili havası, sahil ve güneş",
    "Ayrılık acısı, hüzünlü piyano balad",
    "Eşimle yıl dönümümüz için nostaljik şarkı",
    "Öğretmenime minnettarlık şarkısı",
    "Kahve keyfi, lo-fi akustik, sakin",
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const [inlineGenerating, setInlineGenerating] = useState(false);

  const handleInlineGenerate = useCallback(async () => {
    if (!selectedCat || inlineGenerating) return;
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    setInlineGenerating(true);
    try {
      const description = inlineInput.trim()
        ? selectedCat.item.buildPrompt({
            [selectedCat.item.fields[0]?.key || "name"]: inlineInput.trim(),
          })
        : selectedCat.item.buildPrompt({});
      const style =
        MUSICAL_STYLES[selectedCat.item.title] ||
        "Turkish pop, natural vocals, acoustic guitar";
      // Simple mode — prompt açıklama olarak gider, Suno kendi lyrics üretir
      const prompt = `${style}, ${description}`;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          customMode: false,
          model: "V5_5",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const e = localizeApiError(data, "Şarkı oluşturulamadı");
        toast.error(e.title, e.message);
        return;
      }
      setSelectedCat(null);
      setInlineInput("");
      router.push("/create");
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setInlineGenerating(false);
    }
  }, [selectedCat, inlineInput, inlineGenerating, session, router, toast]);

  useEffect(() => {
    fetch("/api/all-songs?limit=30")
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

  // ── Son dinlediklerin (sadece oturum açmış kullanıcılar) ──
  const [recentPlays, setRecentPlays] = useState<Song[]>([]);
  useEffect(() => {
    if (!session?.user?.id) {
      setRecentPlays([]);
      return;
    }
    fetch("/api/recent-plays?limit=10")
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
      .filter((g) => g.songs.length >= 1)
      .slice(0, 4);
  })();

  return (
    <div className="min-h-full bg-[#121212]">
      {/* ── Suno Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "#06140c" }}
      >
        {/* Hareketli yeşil neon blob'lar */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="hero-neon hero-neon-1" />
          <div className="hero-neon hero-neon-2" />
          <div className="hero-neon hero-neon-3" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, transparent 0%, #121212 75%)",
            }}
          />
        </div>

        <div className="relative pt-[80px] pb-[80px] px-[20px] flex flex-col items-center">
          <h1 className="text-white text-[28px] md:text-[36px] font-bold text-center leading-[1.2] mb-[28px]">
            Hayalindeki şarkıyı
            <br />
            duymanın zamanı
          </h1>

          {/* Hero için global dosya yükleme input'u — her zaman mount */}
          <input
            ref={heroFileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleHeroFilePick}
          />

          {/* Suno input bar */}
          <div className="relative w-full max-w-[560px] bg-[#1a1a1a]/90 backdrop-blur-xl rounded-[16px] border border-[#2a2a2a]">
            {/* Üst — textarea */}
            <textarea
              value={heroPrompt}
              onChange={(e) => setHeroPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              rows={2}
              className="w-full bg-transparent px-[16px] pt-[14px] pb-[4px] text-white text-[15px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && heroPrompt.trim()) {
                  e.preventDefault();
                  router.push(
                    `/create?prompt=${encodeURIComponent(heroPrompt.trim())}`,
                  );
                }
              }}
            />

            {/* Alt — butonlar */}
            <div className="flex items-center justify-between px-[10px] pb-[10px] pt-[4px]">
              {/* Sol — + menü */}
              <div className="relative">
                <button
                  onClick={() => setShowPlusMenu((v) => !v)}
                  className="w-[40px] h-[40px] rounded-full border border-[#3a3a3a] flex items-center justify-center pressable hover:bg-[#2a2a2a] transition-colors"
                >
                  <Plus size={18} className="text-[#999]" />
                </button>
                {showPlusMenu && (
                  <div className="absolute bottom-[52px] left-[-4px] bg-[#2a2a2a] rounded-[12px] py-[6px] shadow-2xl shadow-black/60 z-[100] min-w-[170px] border border-[#3a3a3a]">
                    <button
                      onClick={() => {
                        setShowPlusMenu(false);
                        openRecord();
                      }}
                      className="flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#333] transition-colors w-full text-left pressable"
                    >
                      <Mic2 size={16} className="text-[#ccc]" />
                      <span className="text-white text-[14px] font-medium">
                        Kayıt
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        heroFileInputRef.current?.click();
                        setShowPlusMenu(false);
                      }}
                      className="flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#333] transition-colors w-full text-left pressable"
                    >
                      <Upload size={16} className="text-[#ccc]" />
                      <span className="text-white text-[14px] font-medium">
                        Yükle
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sağ — rastgele + oluştur */}
              <div className="flex items-center gap-[8px]">
                {/* Rastgele buton */}
                <button
                  onClick={() => {
                    const randoms = [
                      "Enerjik dans şarkısı, yaz havası",
                      "Hüzünlü arabesk, gece yağmuru",
                      "Akustik folk, dağ başı, özlem",
                      "Neşeli pop, arkadaşlarla yolculuk",
                      "Romantik slow, yıldızlı gece",
                      "Türkçe rap, sokak hikayesi",
                      "Sufi ilahi, huzur ve tefekkür",
                    ];
                    setHeroPrompt(
                      randoms[Math.floor(Math.random() * randoms.length)],
                    );
                  }}
                  className="w-[40px] h-[40px] rounded-full border border-[#3a3a3a] flex items-center justify-center pressable hover:bg-[#2a2a2a] transition-colors"
                  title="Rastgele prompt"
                >
                  <Shuffle size={18} className="text-[#999]" />
                </button>

                {/* Create butonu */}
                <button
                  onClick={() => {
                    if (heroPrompt.trim()) {
                      router.push(
                        `/create?prompt=${encodeURIComponent(heroPrompt.trim())}`,
                      );
                    } else {
                      router.push("/create");
                    }
                  }}
                  className="flex items-center gap-[6px] pl-[16px] pr-[20px] py-[10px] rounded-full font-bold text-[14px] text-white pressable active:scale-95 transition-transform"
                  style={{
                    background:
                      "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)",
                  }}
                >
                  <Music2 size={15} />
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selamlama hero'ya taşındı */}

      {/* Şarkını oluştur bölümü kaldırıldı — hero input yeterli */}

      {/* Kaldırılan bölümler: Kitaplık, Son dinlediklerin, Son eklenenler */}

      {/* ── Öneriler ── */}
      {recommendations.length > 0 && (
        <Section
          title={
            recsPersonalized
              ? "Günlük müzik ihtiyacın"
              : "Popüler albümler ve single'lar"
          }
        >
          {recommendations.slice(0, 12).map((song) => (
            <SongCard2
              key={song.id}
              song={song}
              onPlay={() => playSong(song, recommendations)}
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && playing}
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
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && playing}
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
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && playing}
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
