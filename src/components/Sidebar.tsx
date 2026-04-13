"use client";

import Link from "next/link";
import { Home, Search, Library, Plus, Music2 } from "lucide-react";

const navItems = [
  { icon: Home, label: "Ana Sayfa", href: "/" },
  { icon: Search, label: "Keşfet", href: "/discover" },
];

interface SidebarProps {
  activePage?: "home" | "discover";
}

export default function Sidebar({ activePage = "home" }: SidebarProps) {
  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col h-full bg-black">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Music2 size={32} className="text-white" />
          <span className="text-white font-bold text-xl tracking-tight">
            AI Müzik
          </span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            (item.href === "/" && activePage === "home") ||
            (item.href === "/discover" && activePage === "discover");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-md text-sm font-bold transition-colors ${
                isActive ? "text-white" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <item.icon
                size={24}
                fill={isActive ? "white" : "none"}
                strokeWidth={isActive ? 0 : 2}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Library section */}
      <div className="mt-4 mx-2 flex-1 bg-[#121212] rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <button className="flex items-center gap-3 text-[#b3b3b3] hover:text-white transition-colors">
            <Library size={22} />
            <span className="text-sm font-bold">Kitaplığın</span>
          </button>
          <button className="text-[#b3b3b3] hover:text-white transition-colors p-1 hover:bg-[#282828] rounded-full">
            <Plus size={18} />
          </button>
        </div>

        {/* Playlist hint */}
        <div className="mx-2 mb-4 p-4 rounded-lg bg-[#242424]">
          <p className="text-white text-sm font-bold mb-1">
            Çalma listesi oluştur
          </p>
          <p className="text-[#b3b3b3] text-xs mb-3">
            İlk çalma listeni oluşturmak çok kolay
          </p>
          <button className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold hover:scale-105 transition-transform">
            Çalma listesi oluştur
          </button>
        </div>

        <div className="px-4 pb-4 mt-auto">
          <Link
            href="#"
            className="text-[#b3b3b3] hover:text-white text-xs hover:underline"
          >
            Çerezler
          </Link>
          {" · "}
          <Link
            href="#"
            className="text-[#b3b3b3] hover:text-white text-xs hover:underline"
          >
            Gizlilik
          </Link>
        </div>
      </div>
    </aside>
  );
}
