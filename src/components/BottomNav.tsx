"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, User } from "lucide-react";
import { useSession } from "next-auth/react";

const tabs = [
  { icon: Home, label: "Ana Sayfa", href: "/" },
  { icon: Compass, label: "Keşfet", href: "/discover" },
  { href: "/create" }, // merkez buton — özel render
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
        // ── Merkez "Oluştur" butonu ──
        if (tab.href === "/create") {
          const isCreate = pathname === "/create";
          return (
            <Link
              key="/create"
              href="/create"
              className="flex-1 flex flex-col items-center justify-center pressable"
            >
              <div
                className="flex items-center justify-center rounded-2xl transition-all"
                style={{
                  width: 52,
                  height: 36,
                  background: isCreate
                    ? "#1db954"
                    : "linear-gradient(135deg, #1db954 0%, #17a045 100%)",
                  boxShadow: isCreate
                    ? "0 0 20px rgba(29,185,84,0.5)"
                    : "0 2px 12px rgba(29,185,84,0.35)",
                }}
              >
                <Plus size={22} strokeWidth={2.8} className="text-black" />
              </div>
              <span className="text-[10px] font-bold tracking-tight mt-1 text-[#1db954]">
                Oluştur
              </span>
            </Link>
          );
        }

        const icon = (
          tab as {
            icon: React.ComponentType<{
              size: number;
              strokeWidth: number;
              className: string;
            }>;
          }
        ).icon;
        const label = (tab as { label: string }).label;
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
              // @ts-expect-error icon tipi
              <icon
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
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
