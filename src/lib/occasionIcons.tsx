import {
  Cake,
  Diamond,
  Heart,
  Flower,
  Medal,
  Baby,
  MoonStars,
  GraduationCap,
  Shield,
  Briefcase,
  Trophy,
  Rocket,
  Feather,
  HandHeart,
  PawPrint,
  Sparkle,
  Mosque,
  HandsPraying,
  Fire,
  Confetti,
  Handshake,
  Star,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import type { OccasionId } from "@/lib/occasions";

export const OCCASION_ICONS: Record<OccasionId, Icon> = {
  dogum_gunu: Cake,
  yil_donumu: Diamond,
  dugun_nisan: Heart,
  anneler_gunu: Flower,
  babalar_gunu: Medal,
  sevgililer_gunu: Heart,
  bebek_hosgeldin: Baby,
  ninni: MoonStars,
  mezuniyet: GraduationCap,
  asker_ugurlama: Shield,
  is_terfi: Briefcase,
  emeklilik: Trophy,
  yeni_is: Rocket,
  anma_vefat: Feather,
  eski_dost: HandHeart,
  evcil_hayvan_anisi: PawPrint,
  sunnet: Sparkle,
  kina_gecesi: HandHeart,
  hac_ugurlama: Mosque,
  mevlid: HandsPraying,
  roast: Fire,
  dogum_gunu_saka: Confetti,
  arkadaslik: Handshake,
  ozel_aniya_ozel: Sparkle,
  genel: Star,
};

export function OccasionIcon({
  id,
  size = 28,
  weight = "duotone",
  className,
}: {
  id: OccasionId;
  size?: number;
  weight?: IconWeight;
  className?: string;
}) {
  const IconComp = OCCASION_ICONS[id] ?? Star;
  return <IconComp size={size} weight={weight} className={className} />;
}

export const CATEGORY_ICONS: Record<string, Icon> = {
  aile: Heart,
  romantik: Heart,
  kutlama: Confetti,
  kultur: Mosque,
  anma: Feather,
  eglence: Fire,
};

/**
 * Her kategori için accent renk teması — kart, sekme ve modal ikon kapsulleri
 * bu rengi kullanır. Native app'lerdeki "klasör rengi" hissi için kategorize.
 */
export interface CategoryTheme {
  accent: string; // ana renk (hex)
  accentSoft: string; // yumuşak gradient stop (hex)
  glow: string; // shadow için rgba
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  aile: {
    accent: "#06b6d4",
    accentSoft: "#0e7490",
    glow: "rgba(6, 182, 212, 0.35)",
  },
  romantik: {
    accent: "#ec4899",
    accentSoft: "#be185d",
    glow: "rgba(236, 72, 153, 0.35)",
  },
  kutlama: {
    accent: "#f59e0b",
    accentSoft: "#b45309",
    glow: "rgba(245, 158, 11, 0.35)",
  },
  kultur: {
    accent: "#19b35c",
    accentSoft: "#065f46",
    glow: "rgba(25, 179, 92, 0.35)",
  },
  anma: {
    accent: "#a78bfa",
    accentSoft: "#6d28d9",
    glow: "rgba(167, 139, 250, 0.35)",
  },
  eglence: {
    accent: "#ef4444",
    accentSoft: "#b91c1c",
    glow: "rgba(239, 68, 68, 0.35)",
  },
};

export function getCategoryTheme(categoryId: string): CategoryTheme {
  return CATEGORY_THEMES[categoryId] ?? CATEGORY_THEMES.kultur;
}

/**
 * Bir occasion'ın hangi kategoriye ait olduğunu döner — modal başlığında
 * tema rengi göstermek için kullanılır.
 */
export const OCCASION_TO_CATEGORY: Record<OccasionId, string> = {
  anneler_gunu: "aile",
  babalar_gunu: "aile",
  bebek_hosgeldin: "aile",
  ninni: "aile",
  arkadaslik: "aile",
  sevgililer_gunu: "romantik",
  yil_donumu: "romantik",
  dugun_nisan: "romantik",
  kina_gecesi: "romantik",
  dogum_gunu: "kutlama",
  mezuniyet: "kutlama",
  is_terfi: "kutlama",
  emeklilik: "kutlama",
  yeni_is: "kutlama",
  asker_ugurlama: "kultur",
  sunnet: "kultur",
  hac_ugurlama: "kultur",
  mevlid: "kultur",
  anma_vefat: "anma",
  eski_dost: "anma",
  evcil_hayvan_anisi: "anma",
  roast: "eglence",
  dogum_gunu_saka: "eglence",
  ozel_aniya_ozel: "eglence",
  genel: "kultur",
};

export function CategoryIcon({
  id,
  size = 14,
  weight = "duotone",
  className,
}: {
  id: string;
  size?: number;
  weight?: IconWeight;
  className?: string;
}) {
  const IconComp = CATEGORY_ICONS[id] ?? Star;
  return <IconComp size={size} weight={weight} className={className} />;
}
