"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Mic2,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  Music2,
  Check,
} from "lucide-react";
import { Persona, Song } from "@/types";

type Step = "list" | "select-song" | "configure" | "creating";

export default function VoicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("list");

  // Create flow state
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vocalStart, setVocalStart] = useState(0);
  const [vocalEnd, setVocalEnd] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Personaları fetch et
  const fetchPersonas = useCallback(async () => {
    try {
      const res = await fetch("/api/personas");
      const d = await res.json();
      setPersonas(d.personas ?? []);
    } catch {
      /* sessizce */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) fetchPersonas();
    else setLoading(false);
  }, [session?.user, fetchPersonas]);

  // Kullanıcının şarkılarını fetch et (create flow)
  const fetchSongs = useCallback(async () => {
    setSongsLoading(true);
    try {
      const res = await fetch("/api/all-songs?limit=50");
      const d = await res.json();
      const completed = (d.songs ?? []).filter(
        (s: Song) => s.status === "complete",
      );
      setSongs(completed);
    } catch {
      /* sessizce */
    } finally {
      setSongsLoading(false);
    }
  }, []);

  const handleStartCreate = () => {
    setError("");
    setSelectedSong(null);
    setName("");
    setDescription("");
    setVocalStart(0);
    setVocalEnd(30);
    setStep("select-song");
    fetchSongs();
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setStep("configure");
  };

  const handleCreate = async () => {
    if (!selectedSong || !name.trim()) {
      setError("Persona adı zorunludur");
      return;
    }
    const duration = vocalEnd - vocalStart;
    if (duration < 10 || duration > 30) {
      setError("Vokal aralığı 10-30 saniye arasında olmalıdır");
      return;
    }

    setError("");
    setCreating(true);
    setStep("creating");

    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: selectedSong.id,
          name: name.trim(),
          description: description.trim() || undefined,
          vocalStart,
          vocalEnd,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Persona oluşturulamadı");
        setStep("configure");
        return;
      }
      // Başarılı — listeye ekle
      await fetchPersonas();
      setStep("list");
    } catch {
      setError("Bağlantı hatası");
      setStep("configure");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/personas/${id}`, { method: "DELETE" });
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* sessizce */
    } finally {
      setDeletingId(null);
    }
  };

  // Giriş yapmamış
  if (!session?.user) {
    return (
      <div className="min-h-full bg-[#0a0a0a]">
        <div className="mx-auto max-w-[640px] px-5 pt-6 pb-28">
          <h1 className="text-white text-2xl font-black">Seslerim</h1>
          <div className="flex flex-col items-center py-20 text-center">
            <Mic2 size={40} className="text-[#333] mb-3" />
            <p className="text-[#555] text-sm mb-4">
              Ses personaları oluşturmak için giriş yap
            </p>
            <button
              onClick={() => router.push("/auth/signin")}
              className="px-6 py-2.5 rounded-full bg-[#1db954] text-black text-sm font-bold pressable"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      <div className="mx-auto max-w-[640px] px-5 pt-6 pb-28">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-black">Seslerim</h1>
            <p className="text-[#666] text-[13px] mt-1">
              Şarkılarından ses personası oluştur
            </p>
          </div>
          {step === "list" && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1db954] text-black text-[13px] font-bold pressable active:scale-95"
            >
              <Plus size={16} />
              Oluştur
            </button>
          )}
          {step !== "list" && step !== "creating" && (
            <button
              onClick={() => setStep("list")}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-[#888] hover:text-white pressable"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Liste görünümü ── */}
        {step === "list" && (
          <>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="text-[#1db954] animate-spin" />
              </div>
            ) : personas.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Mic2 size={40} className="text-[#333] mb-3" />
                <p className="text-white text-sm font-semibold mb-1">
                  Henüz personan yok
                </p>
                <p className="text-[#555] text-xs max-w-[280px] mb-5">
                  Bir şarkından ses personası oluştur, sonraki üretimlerde kendi
                  sesinle şarkı yap
                </p>
                <button
                  onClick={handleStartCreate}
                  className="px-6 py-2.5 rounded-full bg-[#1db954] text-black text-sm font-bold pressable active:scale-95"
                >
                  Persona Oluştur
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {personas.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#141414] group"
                  >
                    {/* Kaynak şarkı thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                      {p.sourceSong?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.sourceSong.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mic2 size={18} className="text-[#444]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] font-semibold truncate">
                        {p.name}
                      </p>
                      <p className="text-[#666] text-[11px] truncate mt-0.5">
                        {p.sourceSong?.title ? `${p.sourceSong.title} · ` : ""}
                        {p.personaType === "voice_persona"
                          ? "Ses personası"
                          : "Stil personası"}
                      </p>
                    </div>

                    {/* Sil */}
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#555] hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all pressable disabled:opacity-50"
                    >
                      {deletingId === p.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Şarkı seç ── */}
        {step === "select-song" && (
          <div>
            <p className="text-[#666] text-[11px] font-semibold uppercase tracking-wider mb-3">
              Şarkı Seç
            </p>
            {songsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-[#1db954] animate-spin" />
              </div>
            ) : songs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Music2 size={32} className="text-[#333] mb-2" />
                <p className="text-[#555] text-sm">
                  Henüz tamamlanmış şarkın yok
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {songs.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSong(s)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors pressable active:scale-[0.98] text-left"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.imageUrl}
                          alt={s.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 size={16} className="text-[#444]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] font-semibold truncate">
                        {s.title}
                      </p>
                      <p className="text-[#555] text-[11px] truncate mt-0.5">
                        {s.style?.split(",")[0]?.trim() || ""}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[#444]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Yapılandır ── */}
        {step === "configure" && selectedSong && (
          <div className="flex flex-col gap-5">
            {/* Seçili şarkı */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#141414]">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                {selectedSong.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedSong.imageUrl}
                    alt={selectedSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 size={16} className="text-[#444]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-semibold truncate">
                  {selectedSong.title}
                </p>
                <p className="text-[#1db954] text-[11px]">Kaynak şarkı</p>
              </div>
              <button
                onClick={() => setStep("select-song")}
                className="text-[#666] text-[11px] font-semibold pressable hover:text-white"
              >
                Değiştir
              </button>
            </div>

            {/* Persona adı */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Persona adı"
              maxLength={50}
              className="w-full bg-transparent border-b border-[#2a2a2a] px-0 py-3 text-white text-lg font-semibold placeholder-[#444] focus:outline-none focus:border-[#1db954] transition-colors"
            />

            {/* Açıklama */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Açıklama (opsiyonel)"
              rows={2}
              maxLength={200}
              className="w-full bg-[#141414] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] resize-none focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all leading-relaxed"
            />

            {/* Vokal aralığı */}
            <div>
              <p className="text-[#666] text-[11px] font-semibold uppercase tracking-wider mb-2">
                Vokal Aralığı (saniye)
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[#555] text-[10px]">Başlangıç</label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={vocalStart}
                    onChange={(e) => setVocalStart(Number(e.target.value))}
                    className="w-full bg-[#141414] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[#555] text-[10px]">Bitiş</label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={vocalEnd}
                    onChange={(e) => setVocalEnd(Number(e.target.value))}
                    className="w-full bg-[#141414] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1db954]/50 transition-all mt-1"
                  />
                </div>
              </div>
              <p className="text-[#444] text-[10px] mt-1.5">
                Aralık 10-30 saniye arasında olmalıdır (şu an:{" "}
                {vocalEnd - vocalStart}sn)
              </p>
            </div>

            {/* Hata */}
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Oluştur butonu */}
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full py-3.5 rounded-full font-bold text-[15px] bg-[#1db954] hover:bg-[#1ed760] text-black active:scale-[0.98] transition-all pressable disabled:opacity-40"
            >
              Persona Oluştur
            </button>
          </div>
        )}

        {/* ── Oluşturuluyor ── */}
        {step === "creating" && (
          <div className="flex flex-col items-center py-20 text-center">
            <Loader2 size={32} className="text-[#1db954] animate-spin mb-4" />
            <p className="text-white text-sm font-semibold">
              Persona oluşturuluyor...
            </p>
            <p className="text-[#555] text-xs mt-1">
              Bu işlem birkaç saniye sürebilir
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
