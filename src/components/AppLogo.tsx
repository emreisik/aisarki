interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: { px: 28, text: "text-xl" },
  md: { px: 36, text: "text-2xl" },
  lg: { px: 52, text: "text-4xl" },
};

function HIcon({ px }: { px: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/test.png"
      alt="Hubeya"
      width={px}
      height={px}
      style={{ display: "block", objectFit: "contain" }}
    />
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
