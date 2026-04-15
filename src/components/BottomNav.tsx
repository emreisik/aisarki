"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, Play, ListMusic, User } from "lucide-react";
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
      className="md:hidden fixed bottom-0 left-0 right-0 border-t z-50"
      style={{
        background: "#111111",
        borderColor: "#2a2a2a",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      {/* Sabit 64px içerik alanı — safe area'nın üstünde */}
      <div className="flex items-stretch h-16">
        {left.map(renderTab)}

        {/* Merkez Oluştur — dikkat çekici */}
        <Link
          href="/create"
          className="flex-1 flex flex-col items-center justify-center pressable relative"
        >
          {/* Outer pulsing ring — sadece inaktif */}
          {!isCreate && (
            <span
              aria-hidden
              className="absolute top-0 w-14 h-10 rounded-2xl animate-ping-slow"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(29,185,84,0.35) 0%, transparent 70%)",
              }}
            />
          )}
          <div
            className="relative flex items-center justify-center rounded-2xl transition-all duration-200"
            style={{
              width: 60,
              height: 38,
              background: isCreate
                ? "linear-gradient(135deg, #ffffff 0%, #e8ffef 50%, #c9f5d4 100%)"
                : "linear-gradient(135deg, #1ed760 0%, #1db954 50%, #179c42 100%)",
              boxShadow: isCreate
                ? "0 0 36px rgba(29,185,84,1), 0 4px 20px rgba(29,185,84,0.7), inset 0 0 0 2px #1db954, inset 0 1px 0 rgba(255,255,255,0.4)"
                : "0 0 20px rgba(29,185,84,0.55), 0 4px 14px rgba(29,185,84,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
              transform: isCreate ? "scale(1.08)" : "scale(1)",
            }}
          >
            {isCreate ? (
              <Play
                size={22}
                strokeWidth={2.8}
                fill="#1db954"
                className="text-[#1db954] ml-0.5"
              />
            ) : (
              <span className="relative w-6 h-6 flex items-center justify-center">
                <Plus
                  size={24}
                  strokeWidth={3}
                  className="text-black absolute inset-0 animate-icon-plus"
                />
                <Play
                  size={22}
                  strokeWidth={2.8}
                  fill="black"
                  className="text-black absolute inset-0 ml-0.5 animate-icon-play"
                />
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-extrabold tracking-tight mt-0.5 ${
              isCreate
                ? "text-white drop-shadow-[0_0_8px_rgba(29,185,84,0.9)]"
                : "text-[#1db954] drop-shadow-[0_0_6px_rgba(29,185,84,0.6)]"
            }`}
          >
            Oluştur
          </span>
        </Link>

        {right.map(renderTab)}
      </div>
    </nav>
  );
}
