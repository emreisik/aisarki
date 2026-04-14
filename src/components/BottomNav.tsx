"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, ListMusic, User } from "lucide-react";
import { useSession } from "next-auth/react";

const SIDE_TABS = [
  { icon: Home, label: "Ana Sayfa", href: "/" },
  { icon: Compass, label: "Keşfet", href: "/discover" },
  { icon: ListMusic, label: "Listeler", href: "/playlists" },
  { icon: User, label: "Profil", href: "/profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isCreate = pathname === "/create";

  // Sol 2 tab + merkez + sağ 2 tab
  const left = SIDE_TABS.slice(0, 2);
  const right = SIDE_TABS.slice(2);

  const renderTab = (tab: (typeof SIDE_TABS)[number]) => {
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
        className="flex-1 flex flex-col items-center justify-center gap-0.5 pressable relative"
      >
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-200"
          style={{
            width: isActive ? 20 : 0,
            height: 2,
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
            style={{ opacity: isActive ? 1 : 0.6 }}
          />
        ) : (
          <Icon
            size={22}
            strokeWidth={isActive ? 2.5 : 1.8}
            className={isActive ? "text-white" : "text-[#888]"}
          />
        )}
        <span
          className={`text-[10px] font-semibold tracking-tight transition-colors ${
            isActive ? "text-white" : "text-[#888]"
          }`}
        >
          {tab.label}
        </span>
      </Link>
    );
  };

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
      {left.map(renderTab)}

      {/* Merkez Oluştur */}
      <Link
        href="/create"
        className="flex-1 flex flex-col items-center justify-center pressable"
      >
        <div
          className="flex items-center justify-center rounded-2xl transition-all duration-200"
          style={{
            width: 52,
            height: 34,
            background: "#1db954",
            boxShadow: isCreate
              ? "0 0 24px rgba(29,185,84,0.6)"
              : "0 2px 14px rgba(29,185,84,0.4)",
            transform: isCreate ? "scale(1.05)" : "scale(1)",
          }}
        >
          <Plus size={22} strokeWidth={2.8} className="text-black" />
        </div>
        <span className="text-[10px] font-bold tracking-tight mt-1 text-[#1db954]">
          Oluştur
        </span>
      </Link>

      {right.map(renderTab)}
    </nav>
  );
}
