"use client";

import Link from "next/link";
import { Home, Compass, PlusCircle } from "lucide-react";

const tabs = [
  { icon: Home, label: "Ana Sayfa", href: "/", key: "home" },
  { icon: Compass, label: "Keşfet", href: "/discover", key: "discover" },
  { icon: PlusCircle, label: "Oluştur", href: "/create", key: "create" },
] as const;

interface BottomNavProps {
  active: "home" | "discover" | "create";
}

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-stretch border-t z-50"
      style={{
        background: "#111111",
        borderColor: "#2a2a2a",
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-1 pressable relative"
          >
            {/* Active indicator bar at top */}
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all"
              style={{
                width: isActive ? "24px" : "0px",
                height: "2px",
                background: "#1db954",
                opacity: isActive ? 1 : 0,
              }}
            />
            <tab.icon
              size={24}
              strokeWidth={isActive ? 2.5 : 1.8}
              className={isActive ? "text-white" : "text-[#535353]"}
            />
            <span
              className={`text-[10px] font-semibold tracking-tight transition-colors ${
                isActive ? "text-white" : "text-[#535353]"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
