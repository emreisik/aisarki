"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import AudioPlayer from "./AudioPlayer";
import MiniPlayer from "./MiniPlayer";

export default function PlayerShell() {
  const { playerOpen, currentSong } = usePlayer();

  return (
    <>
      {playerOpen && currentSong && <AudioPlayer />}
      <MiniPlayer />
    </>
  );
}
