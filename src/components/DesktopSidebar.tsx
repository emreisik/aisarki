"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  Compass,
  Library,
  Music2,
  Wand2,
  Bell,
  ChevronDown,
  ChevronLeft,
  Lock,
  User,
  CreditCard,
  Settings,
  Heart,
  LogOut,
} from "lucide-react";
import AppLogo from "./AppLogo";
import { useSession } from "next-auth/react";
import { useCredits } from "@/contexts/CreditsContext";
import { handleSignOut } from "@/lib/authUtils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  requiresPlan?: "pro" | "premier";
  match?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/discover", label: "Keşfet", icon: Compass },
  { href: "/create", label: "Oluştur", icon: Music2 },
  {
    href: "/pricing",
    label: "Stüdyo",
    icon: Wand2,
    requiresPlan: "premier",
    match: "/studio",
  },
  { href: "/playlists", label: "Kitaplık", icon: Library },
  { href: "/notifications", label: "Bildirimler", icon: Bell },
];

const USER_MENU = [
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings/billing", label: "Abonelik", icon: CreditCard },
  { href: "/settings/account", label: "Hesap", icon: Settings },
  { href: "/settings/taste", label: "Müzik Zevkim", icon: Heart },
] as const;

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { credits, plan } = useCredits();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const isFreePlan = !plan || plan.id === "free";
  const userImage = session?.user?.image as string | undefined;
  const userName = session?.user?.name as string | undefined;

  return (
    <aside className="hidden md:flex flex-col gap-0 w-[280px] fixed left-0 top-0 bottom-[90px] z-30 p-3 select-none bg-black">
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-2 pt-2 pb-4">
        <AppLogo size="md" showText />
        <button
          className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white transition-colors"
          aria-label="Menüyü daralt"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* User card + dropdown */}
      {session?.user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#141414] transition-colors pressable group"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#3b82f6] to-[#f97316] flex items-center justify-center">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName ?? "User"}
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-[14px]">
                  {(userName ?? "R").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-white text-[14px] font-semibold truncate leading-tight">
                {userName ?? "Kullanıcı"}
              </div>
              <div className="text-[#888] text-[12px] leading-tight mt-0.5">
                {credits?.balance ?? "…"} kredi
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`text-[#555] group-hover:text-white transition-transform flex-shrink-0 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute top-[60px] left-0 right-0 bg-[#1c1c1c] border border-[#2a2a2a] rounded-[14px] py-2 shadow-2xl shadow-black/70 z-50"
            >
              {USER_MENU.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors pressable ${
                      active
                        ? "text-white bg-[#262626]"
                        : "text-[#bbb] hover:text-white hover:bg-[#262626]"
                    }`}
                  >
                    <Icon size={16} className="opacity-80" />
                    <span className="text-[14px] font-medium">{label}</span>
                  </Link>
                );
              })}
              <div className="my-1.5 mx-3 h-px bg-[#2a2a2a]" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleSignOut();
                }}
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[#bbb] hover:text-white hover:bg-[#262626] transition-colors pressable"
              >
                <LogOut size={16} className="opacity-80" />
                <span className="text-[14px] font-medium">Çıkış yap</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => router.push("/auth/signin")}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] transition-colors pressable text-white text-[13px] font-semibold justify-center"
        >
          Giriş yap
        </button>
      )}

      {/* Upgrade to Pro button (sadece free planda) */}
      {isFreePlan && session?.user && (
        <Link
          href="/pricing"
          className="mt-3 h-10 rounded-full border border-[#2a2a2a] hover:bg-[#141414] flex items-center justify-center text-white text-[13px] font-semibold pressable transition-colors"
        >
          Pro&apos;ya Yükselt
        </Link>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 mt-6">
        {NAV_ITEMS.map(({ href, label, icon: Icon, requiresPlan, match }) => {
          const activePath = match ?? href;
          const isActive =
            pathname === activePath ||
            (activePath !== "/" && pathname.startsWith(activePath));
          const isLocked =
            requiresPlan === "premier"
              ? plan?.id !== "premier"
              : requiresPlan === "pro"
                ? plan?.id === "free"
                : false;

          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-md text-[15px] font-medium transition-colors pressable ${
                isActive ? "text-white" : "text-[#888] hover:text-white"
              }`}
            >
              <Icon
                size={22}
                fill={isActive && label === "Ana Sayfa" ? "white" : "none"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="flex-1">{label}</span>
              {isLocked && <Lock size={12} className="text-[#555]" />}
            </Link>
          );
        })}
      </nav>

      {/* Alt boşluk (footer için scroll alanı) */}
      <div className="flex-1" />

      {/* Footer — küçük marka/copyright */}
      <div className="px-3 py-3 text-[11px] text-[#555]">
        © {new Date().getFullYear()} Rifmo
      </div>
    </aside>
  );
}
