"use client";

import DesktopSidebar from "./DesktopSidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import PlayerShell from "./PlayerShell";
import AppLogo from "./AppLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";

function BottomSpacer() {
  const { currentSong } = usePlayer();
  return (
    <>
      {/* Mobile: navbar (64px + 12px extra safe padding) + mini player (~72px) + gap */}
      <div
        className="md:hidden flex-shrink-0"
        style={{
          height: currentSong
            ? "calc(156px + env(safe-area-inset-bottom, 0px))"
            : "calc(76px + env(safe-area-inset-bottom, 0px))",
        }}
      />
      {/* Desktop: player bar (90px) */}
      <div className="hidden md:block flex-shrink-0" style={{ height: 90 }} />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auth sayfaları — sidebar/nav/player yok, tam sayfa
  if (pathname.startsWith("/auth")) {
    return <div className="h-full overflow-y-auto scroll-area">{children}</div>;
  }

  return (
    <>
      <DesktopSidebar />

      {/* Content area — ml-[280px] on desktop, relative container */}
      <div className="h-full md:ml-[280px] relative">
        {/* Scroll area — full height */}
        <div
          id="main-scroll"
          className="h-full overflow-y-auto scroll-area pt-12 md:pt-0"
        >
          {children}
          <BottomSpacer />
        </div>

        {/* TopBar floats on top of scroll content */}
        <div className="hidden md:block absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <TopBar />
          </div>
        </div>
      </div>

      {/* Mobile header — logo ortada */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-center h-12 bg-[#121212]/80 backdrop-blur-md border-b border-white/5 pointer-events-none">
        <Link href="/" className="pointer-events-auto">
          <AppLogo size="sm" showText />
        </Link>
      </div>

      <BottomNav />
      <PlayerShell />
    </>
  );
}
