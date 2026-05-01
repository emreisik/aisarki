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
