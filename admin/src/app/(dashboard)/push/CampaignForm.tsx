"use client";

import { useEffect, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendCampaignAction, getSegmentCount } from "./actions";
import type { PushSegment } from "@/lib/push";

const SEGMENTS: { value: PushSegment; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "premier", label: "Premier" },
];

export default function CampaignForm({
  initialCounts,
}: {
  initialCounts: Record<PushSegment, number>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [segment, setSegment] = useState<PushSegment>("all");
  const [counts, setCounts] =
    useState<Record<PushSegment, number>>(initialCounts);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const targetCount = counts[segment] ?? 0;

  // Segment değişince count'u tazele (subscription ekleyip/çıkarma olabilir)
  useEffect(() => {
    let cancelled = false;
    getSegmentCount(segment).then((c) => {
      if (!cancelled) setCounts((prev) => ({ ...prev, [segment]: c }));
    });
    return () => {
      cancelled = true;
    };
  }, [segment]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    if (!title.trim() || !body.trim()) {
      setError("Başlık ve mesaj gerekli.");
      return;
    }
    const msg = `"${title.trim()}" kampanyası ${targetCount} kişiye gönderilecek. Onaylıyor musun?`;
    if (!confirm(msg)) return;

    start(async () => {
      const res = await sendCampaignAction({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
        segment,
      });
      if (!res.ok) setError(res.error);
      else {
        setSuccess(
          `Gönderildi: ${res.sentCount}/${res.targetCount} · hata: ${res.failedCount}`,
        );
        setTitle("");
        setBody("");
        setUrl("");
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3"
    >
      <div>
        <label className="block text-xs text-[var(--text2)] mb-1.5">
          Başlık ({title.length}/60)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder="Örn: Yeni v5 modeli yayında"
          className="w-full px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text2)] mb-1.5">
          Mesaj ({body.length}/200)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Kısa ve öz — bildirim alanı dar."
          className="w-full px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text2)] mb-1.5">
          URL (opsiyonel — tıklanınca açılır)
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://rifmo.com/..."
          className="w-full px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] font-mono"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text2)] mb-1.5">
          Hedef kitle
        </label>
        <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-md p-0.5">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSegment(s.value)}
              className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                segment === s.value
                  ? "bg-[var(--surface3)] text-white"
                  : "text-[var(--text2)] hover:text-white"
              }`}
            >
              {s.label}
              <span className="ml-1.5 text-[var(--text3)] tabular-nums">
                {counts[s.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/25 rounded px-2.5 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/25 rounded px-2.5 py-2">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--text2)]">
          Hedef kitle: <span className="font-semibold">{targetCount}</span>{" "}
          cihaz
        </div>
        <button
          type="submit"
          disabled={
            pending || !title.trim() || !body.trim() || targetCount === 0
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Send size={13} strokeWidth={2} />
          {pending ? "Gönderiliyor…" : "Gönder"}
        </button>
      </div>
    </form>
  );
}
