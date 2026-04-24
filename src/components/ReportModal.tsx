"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, Check } from "lucide-react";

const REASONS = [
  { id: "spam", label: "Spam" },
  { id: "abuse", label: "Taciz veya nefret söylemi" },
  { id: "copyright", label: "Telif hakkı ihlali" },
  { id: "inappropriate", label: "Uygunsuz içerik" },
  { id: "other", label: "Diğer" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: "song" | "user";
  targetId: string;
  targetLabel: string;
};

export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: Props) {
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setNote("");
    setDone(false);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open && !closing) return null;

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bildirim gönderilemedi");
        return;
      }
      setDone(true);
      setTimeout(() => dismiss(), 1500);
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm ${closing ? "backdrop-exit" : "backdrop-enter"}`}
        onClick={dismiss}
      />
      <div
        className={`relative z-10 w-full max-w-[480px] bg-[#161616] border border-[#222] rounded-[20px] p-6 shadow-2xl ${closing ? "modal-exit" : "modal-enter"}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-[17px] font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            Raporla
          </h2>
          <button
            onClick={dismiss}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-[#222] hover:bg-[#2a2a2a] flex items-center justify-center pressable disabled:opacity-50"
            aria-label="Kapat"
          >
            <X size={14} className="text-[#aaa]" />
          </button>
        </div>
        <p className="text-[#888] text-[13px] mb-5">
          {targetType === "song" ? "Şarkı" : "Kullanıcı"}:{" "}
          <span className="text-white/90">{targetLabel}</span>
        </p>

        {done ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1db954]/20 flex items-center justify-center mb-3">
              <Check size={22} className="text-[#1ed760]" />
            </div>
            <p className="text-white text-[15px] font-semibold">
              Bildirim alındı
            </p>
            <p className="text-[#888] text-[12px] mt-1">
              İnceleme kuyruğuna eklendi
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`text-left px-4 py-3 rounded-lg border text-[13px] font-medium transition-colors pressable ${
                    reason === r.id
                      ? "border-[#1db954] bg-[#1db954]/10 text-white"
                      : "border-[#2a2a2a] bg-[#0e0e0e] text-[#bbb] hover:border-[#3a3a3a]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Eklemek istediğin not (opsiyonel, maks 500 karakter)"
              rows={3}
              className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#3a3a3a] resize-none"
            />

            {error && <p className="text-red-400 text-[12px] mt-2">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={dismiss}
                disabled={submitting}
                className="flex-1 h-11 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white text-[13px] font-semibold pressable disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={submit}
                disabled={!reason || submitting}
                className="flex-1 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold pressable flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Raporla"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
