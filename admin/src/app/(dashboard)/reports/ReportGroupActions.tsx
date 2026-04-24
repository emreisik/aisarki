"use client";

import { useState, useTransition } from "react";
import {
  dismissGroupAction,
  takedownFromReportAction,
  banReporterAction,
} from "./actions";

export default function ReportGroupActions({
  targetType,
  targetId,
  alreadyTakenDown,
  reporters,
}: {
  targetType: string;
  targetId: string;
  alreadyTakenDown: boolean;
  reporters: { id: string; label: string }[];
}) {
  const [mode, setMode] = useState<null | "dismiss" | "takedown" | "ban">(null);
  const [reason, setReason] = useState("");
  const [selectedReporter, setSelectedReporter] = useState<string>(
    reporters[0]?.id ?? "",
  );
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const reset = () => {
    setMode(null);
    setReason("");
    setError(undefined);
  };

  const submit = () => {
    setError(undefined);
    setSuccess(undefined);

    if (mode === "dismiss") {
      if (!confirm("Bu target'a ait açık tüm raporlar reddedilsin mi?")) return;
      start(async () => {
        const res = await dismissGroupAction(targetType, targetId, reason);
        if (!res.ok) setError(res.error);
        else {
          setSuccess("Raporlar reddedildi.");
          setMode(null);
        }
      });
    }

    if (mode === "takedown") {
      if (targetType !== "song") {
        setError("Takedown sadece song target'lar için.");
        return;
      }
      if (!confirm("Şarkıyı takedown ederek raporları kapatalım mı?")) return;
      start(async () => {
        const res = await takedownFromReportAction(targetId, reason);
        if (!res.ok) setError(res.error);
        else {
          setSuccess(
            alreadyTakenDown
              ? "Raporlar kapatıldı (şarkı zaten takedown idi)."
              : "Şarkı takedown edildi + raporlar kapatıldı.",
          );
          setMode(null);
        }
      });
    }

    if (mode === "ban") {
      if (!selectedReporter) {
        setError("Ban'lanacak reporter seçilmedi.");
        return;
      }
      if (
        !confirm("Seçilen reporter banlansın ve tüm açık raporları iptal mı?")
      )
        return;
      start(async () => {
        const res = await banReporterAction(selectedReporter, reason);
        if (!res.ok) setError(res.error);
        else {
          setSuccess("Reporter banlandı.");
          setMode(null);
        }
      });
    }
  };

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      {!mode && (
        <div className="flex flex-wrap gap-2">
          {targetType === "song" && !alreadyTakenDown && (
            <button
              onClick={() => setMode("takedown")}
              className="px-2.5 py-1.5 rounded text-xs bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white"
            >
              Takedown + kapat
            </button>
          )}
          {targetType === "song" && alreadyTakenDown && (
            <span className="px-2.5 py-1.5 rounded text-xs bg-[var(--surface2)] text-[var(--text3)] border border-[var(--border)]">
              Şarkı zaten takedown
            </span>
          )}
          <button
            onClick={() => setMode("dismiss")}
            className="px-2.5 py-1.5 rounded text-xs bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)]"
          >
            Reddet (dismiss)
          </button>
          <button
            onClick={() => setMode("ban")}
            className="px-2.5 py-1.5 rounded text-xs bg-[var(--warn)]/15 text-[var(--warn)] border border-[var(--warn)]/25 hover:bg-[var(--warn)]/20"
          >
            Reporter ban
          </button>
        </div>
      )}

      {mode && (
        <div className="space-y-2">
          <div className="text-xs text-[var(--text2)]">
            {mode === "dismiss" && "Dismiss gerekçesi (audit'e yazılır)"}
            {mode === "takedown" && "Takedown sebebi (kullanıcıya gösterilmez)"}
            {mode === "ban" && "Ban sebebi"}
          </div>

          {mode === "ban" && (
            <select
              value={selectedReporter}
              onChange={(e) => setSelectedReporter(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
            >
              {reporters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sebep (opsiyonel)"
            className="w-full px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
          />

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={pending}
              className="px-3 py-1.5 rounded text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium disabled:opacity-60"
            >
              {pending ? "İşleniyor…" : "Onayla"}
            </button>
            <button
              onClick={reset}
              disabled={pending}
              className="px-3 py-1.5 rounded text-xs bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)]"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/25 rounded px-2.5 py-1.5">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-2 text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/25 rounded px-2.5 py-1.5">
          {success}
        </div>
      )}
    </div>
  );
}
