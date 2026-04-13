"use client";

import DesktopSidebar from "./DesktopSidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import PlayerShell from "./PlayerShell";
import { usePathname } from "next/navigation";

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
          className="h-full overflow-y-auto scroll-area"
          style={{ paddingBottom: "90px" }}
        >
          {children}
        </div>

        {/* TopBar floats on top of scroll content */}
        <div className="hidden md:block absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <TopBar />
          </div>
        </div>
      </div>

      <BottomNav />
      <PlayerShell />
    </>
  );
}
