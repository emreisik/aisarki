"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, PlusCircle, User } from "lucide-react";
import { useSession } from "next-auth/react";

const tabs = [
  { icon: Home, label: "Ana Sayfa", href: "/" },
  { icon: Compass, label: "Keşfet", href: "/discover" },
  { icon: PlusCircle, label: "Oluştur", href: "/create" },
  { icon: User, label: "Profil", href: "/profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 flex items-stretch border-t z-50"
      style={{
        background: "#111111",
        borderColor: "#2a2a2a",
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
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
            className="flex-1 flex flex-col items-center justify-center gap-1 pressable relative"
          >
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all"
              style={{
                width: isActive ? "24px" : "0px",
                height: "2px",
                background: "#1db954",
                opacity: isActive ? 1 : 0,
              }}
            />
            {tab.href === "/profile" && session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
                style={{ opacity: isActive ? 1 : 0.5 }}
              />
            ) : (
              <tab.icon
                size={24}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? "text-white" : "text-[#535353]"}
              />
            )}
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
