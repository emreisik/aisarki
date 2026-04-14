interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: { px: 28, text: "text-xl" },
  md: { px: 36, text: "text-2xl" },
  lg: { px: 52, text: "text-4xl" },
};

/*
  Beyaz daire içinde:
  - Sol ve sağ H stem'leri
  - Crossbar yerine sağa bakan play üçgeni (► )
  H harfi + play iconu tek formda birleşiyor
*/
function HIcon({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Beyaz daire */}
      <circle cx="20" cy="20" r="20" fill="white" />

      {/* Sol stem */}
      <rect x="7" y="7.5" width="6.5" height="25" rx="1" fill="black" />

      {/* Sağ stem */}
      <rect x="26.5" y="7.5" width="6.5" height="25" rx="1" fill="black" />

      {/* Play üçgeni — sol iç kenardan sağ iç kenara, crossbar hizasında */}
      <polygon points="13.5,13 13.5,27 27,20" fill="black" />
    </svg>
  );
}

export default function AppLogo({
  size = "md",
  showText = false,
}: AppLogoProps) {
  const s = sizes[size];

  if (!showText) return <HIcon px={s.px} />;

  return (
    <div className="flex items-center gap-2.5">
      <HIcon px={s.px} />
      <span
        className={`${s.text} font-black text-white tracking-tight leading-none`}
        style={{ fontFamily: "inherit" }}
      >
        Hubeya
      </span>
    </div>
  );
}
