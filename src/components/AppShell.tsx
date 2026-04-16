"use client";

import DesktopSidebar from "./DesktopSidebar";
import BottomNav from "./BottomNav";
import PlayerShell from "./PlayerShell";
import GlobalProcessingBanner from "./GlobalProcessingBanner";
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
        {/* Scroll area — full height, no top header */}
        <div
          id="main-scroll"
          className="h-full overflow-y-auto scroll-area"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          {children}
          <BottomSpacer />
        </div>
      </div>

      <BottomNav />
      <PlayerShell />
      <GlobalProcessingBanner />
    </>
  );
}
