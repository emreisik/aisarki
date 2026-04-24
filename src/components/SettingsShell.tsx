"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Settings, Heart, User } from "lucide-react";
import type { ReactNode } from "react";

const SETTINGS_NAV = [
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings/billing", label: "Abonelik", icon: CreditCard },
  { href: "/settings/account", label: "Hesap", icon: Settings },
  { href: "/settings/taste", label: "Müzik Zevkim", icon: Heart },
] as const;

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function SettingsShell({ title, description, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1100px] px-4 lg:px-8 pt-6 pb-28">
        <h1 className="text-white text-[28px] md:text-[32px] font-bold mb-6 px-1">
          Ayarlar
        </h1>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-[240px] lg:flex-shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors flex-shrink-0 pressable ${
                      active
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#888] hover:text-white hover:bg-[#141414]"
                    }`}
                  >
                    <Icon size={16} className="opacity-80" />
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="mb-5 px-1">
              <h2 className="text-white text-[20px] font-bold">{title}</h2>
              {description && (
                <p className="text-[#888] text-[13px] mt-1">{description}</p>
              )}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
