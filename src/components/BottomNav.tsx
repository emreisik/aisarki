"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Library, User } from "lucide-react";
import { useSession } from "next-auth/react";

const TABS = [
  { icon: Home, label: "Ana Sayfa", href: "/" },
  { icon: Search, label: "Keşfet", href: "/discover" },
  { icon: PlusSquare, label: "Oluştur", href: "/create" },
  { icon: Library, label: "Kitaplık", href: "/playlists" },
  { icon: User, label: "Profil", href: "/profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "#000",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-[50px]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href === "/profile" && pathname.startsWith("/auth"));
          const href =
            tab.href === "/profile"
              ? session?.user
                ? "/profile"
                : "/auth/signin"
              : tab.href;

          return (
            <Link
              key={tab.href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] pressable"
            >
              {tab.href === "/profile" && session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="w-[24px] h-[24px] rounded-full object-cover"
                  style={{
                    opacity: isActive ? 1 : 0.5,
                    outline: isActive ? "1.5px solid white" : "none",
                    outlineOffset: "1px",
                  }}
                />
              ) : (
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? "text-white" : "text-[#b3b3b3]"}
                />
              )}
              <span
                className={`text-[10px] leading-none ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-[#b3b3b3] font-normal"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
