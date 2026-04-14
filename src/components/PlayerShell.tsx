"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import AudioPlayer from "./AudioPlayer";
import MiniPlayer from "./MiniPlayer";
import DesktopPlayerBar from "./DesktopPlayerBar";
import GateModal from "./GateModal";

export default function PlayerShell() {
  const { playerOpen, currentSong } = usePlayer();

  return (
    <>
      {/* Full-screen overlay player (both mobile + desktop) */}
      {playerOpen && currentSong && <AudioPlayer />}

      {/* Mobile mini player — hidden on desktop */}
      <div className="md:hidden">
        <MiniPlayer />
      </div>

      {/* Desktop bottom player bar — hidden on mobile */}
      <DesktopPlayerBar />

      {/* Üyelik gate modal */}
      <GateModal />
    </>
  );
}
