"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronLeft, ChevronRight, User, LogOut, LogIn } from "lucide-react";
import Link from "next/link";

export default function TopBar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll dinle — parent scroll container'dan mesaj al
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Dışarı tıklanınca menüyü kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className={`hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-20 transition-colors duration-300 ${
        scrolled ? "bg-[#121212]/95 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      {/* Navigation arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors pressable"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
        <button
          onClick={() => router.forward()}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors pressable"
        >
          <ChevronRight size={18} className="text-white" />
        </button>
      </div>

      {/* Right side: user menu */}
      <div className="flex items-center gap-2">
        {session?.user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 bg-black/40 hover:bg-black/60 rounded-full pl-1 pr-3 py-1 transition-colors pressable"
            >
              <div className="w-7 h-7 rounded-full bg-[#535353] overflow-hidden flex-shrink-0">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={14} className="text-white" />
                  </div>
                )}
              </div>
              <span className="text-white text-sm font-semibold">
                {session.user.name ||
                  (session.user as { username?: string }).username}
              </span>
              <ChevronLeft
                size={14}
                className={`text-white transition-transform ${menuOpen ? "rotate-90" : "-rotate-90"}`}
              />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#282828] rounded-md shadow-2xl overflow-hidden z-50">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-[#3e3e3e] transition-colors"
                >
                  <User size={16} />
                  Profil
                </Link>
                <div className="h-px bg-[#3e3e3e]" />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-[#3e3e3e] transition-colors text-left"
                >
                  <LogOut size={16} />
                  Çıkış yap
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="flex items-center gap-2 bg-white text-black rounded-full px-4 py-1.5 text-sm font-bold hover:scale-105 transition-transform pressable"
          >
            <LogIn size={14} />
            Giriş yap
          </Link>
        )}
      </div>
    </div>
  );
}
