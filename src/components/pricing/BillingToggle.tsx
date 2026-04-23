"use client";

export type BillingPeriod = "monthly" | "yearly";

type Props = {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
};

export default function BillingToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-6">
      <button
        onClick={() => onChange("monthly")}
        className="flex items-center gap-2 text-[15px]"
      >
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            value === "monthly"
              ? "border-[#3b82f6] bg-[#3b82f6]"
              : "border-[#555]"
          }`}
        >
          {value === "monthly" && (
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </span>
        <span className={value === "monthly" ? "text-white" : "text-[#aaa]"}>
          Aylık
        </span>
      </button>

      <button
        onClick={() => onChange("yearly")}
        className="flex items-center gap-2 text-[15px]"
      >
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            value === "yearly"
              ? "border-[#3b82f6] bg-[#3b82f6]"
              : "border-[#555]"
          }`}
        >
          {value === "yearly" && (
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </span>
        <span className={value === "yearly" ? "text-white" : "text-[#aaa]"}>
          Yıllık
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3b82f6] text-white">
          SINIRLI SÜRE
        </span>
      </button>
    </div>
  );
}
