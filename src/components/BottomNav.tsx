"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Library, User } from "lucide-react";
import { useSession } from "next-auth/react";

const TABS = [
  { icon: Home, label: "Ana Sayfa", href: "/" },
  { icon: Search, label: "Keşfet", href: "/discover" },
  { icon: PlusCircle, label: "Oluştur", href: "/create" },
  { icon: Library, label: "Kitaplık", href: "/playlists" },
  { icon: User, label: "Profil", href: "/profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-[#282828]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-[52px]">
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
              className="flex-1 flex flex-col items-center justify-center gap-1 pressable"
            >
              {tab.href === "/profile" && session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="w-[22px] h-[22px] rounded-full object-cover"
                  style={{
                    opacity: isActive ? 1 : 0.5,
                    outline: isActive ? "2px solid white" : "none",
                    outlineOffset: "1px",
                  }}
                />
              ) : (
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  fill={isActive ? "white" : "none"}
                  className={isActive ? "text-white" : "text-[#b3b3b3]"}
                />
              )}
              <span
                className={`text-[10px] font-medium leading-none ${
                  isActive ? "text-white" : "text-[#b3b3b3]"
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
