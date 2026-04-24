"use client";

import { useState, useTransition } from "react";
import { takedownSongAction, restoreSongAction } from "./actions";

export default function SongRowActions({
  songId,
  isTakedown,
}: {
  songId: string;
  isTakedown: boolean;
}) {
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const doTakedown = () => {
    setError(undefined);
    if (!showReason) {
      setShowReason(true);
      return;
    }
    if (
      !confirm("Takedown uygulansın mı? Şarkı feed ve discover'dan gizlenir.")
    )
      return;
    start(async () => {
      const res = await takedownSongAction(songId, reason.trim());
      if (!res.ok) setError(res.error);
      else {
        setShowReason(false);
        setReason("");
      }
    });
  };

  const doRestore = () => {
    setError(undefined);
    if (!confirm("Şarkıyı geri yükle?")) return;
    start(async () => {
      const res = await restoreSongAction(songId);
      if (!res.ok) setError(res.error);
    });
  };

  if (isTakedown) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={doRestore}
          disabled={pending}
          className="px-2.5 py-1 rounded text-xs bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)] disabled:opacity-60"
        >
          {pending ? "…" : "Restore"}
        </button>
        {error && (
          <div className="text-[10px] text-[var(--danger)]">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {showReason && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Sebep (opsiyonel)"
          className="px-2 py-1 rounded bg-[var(--surface2)] border border-[var(--border)] text-xs outline-none focus:border-[var(--accent)] w-[180px]"
        />
      )}
      <div className="flex gap-1">
        {showReason && (
          <button
            onClick={() => {
              setShowReason(false);
              setReason("");
              setError(undefined);
            }}
            className="px-2 py-1 rounded text-xs bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)]"
          >
            İptal
          </button>
        )}
        <button
          onClick={doTakedown}
          disabled={pending}
          className="px-2.5 py-1 rounded text-xs bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white disabled:opacity-60"
        >
          {pending ? "…" : showReason ? "Uygula" : "Takedown"}
        </button>
      </div>
      {error && <div className="text-[10px] text-[var(--danger)]">{error}</div>}
    </div>
  );
}
