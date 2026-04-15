"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Playlist } from "@/types";
import {
  Plus,
  Music2,
  ListMusic,
  Disc3,
  Search,
  X,
  ChevronRight,
} from "lucide-react";

// ── Type picker ───────────────────────────────────────────────────────────────

function TypePicker({
  value,
  onChange,
}: {
  value: "playlist" | "album";
  onChange: (v: "playlist" | "album") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {(
        [
          {
            type: "playlist" as const,
            icon: ListMusic,
            label: "Çalma Listesi",
            desc: "Farklı şarkıları bir araya getir",
            color: "#477D95",
          },
          {
            type: "album" as const,
            icon: Disc3,
            label: "Albüm",
            desc: "Kendi ürettiğin eserler",
            color: "#1db954",
          },
        ] as const
      ).map(({ type, icon: Icon, label, desc, color }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all pressable"
          style={{
            borderColor: value === type ? color : "#2a2a2a",
            background: value === type ? color + "15" : "#1a1a1a",
          }}
        >
          <Icon
            size={28}
            style={{ color: value === type ? color : "#535353" }}
          />
          <span
            className="text-sm font-bold"
            style={{ color: value === type ? "white" : "#a7a7a7" }}
          >
            {label}
          </span>
          <span
            className="text-xs text-center leading-tight"
            style={{ color: "#535353" }}
          >
            {desc}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: Playlist) => void;
}) {
  const [collectionType, setCollectionType] = useState<"playlist" | "album">(
    "playlist",
  );
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!title.trim()) {
      setErr("Başlık zorunludur");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim(),
          type: collectionType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      onCreate(data.playlist);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const isAlbum = collectionType === "album";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end pb-[calc(76px+env(safe-area-inset-bottom,0px))] sm:pb-0 sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative z-10 w-full sm:max-w-md bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-lg font-bold">Yeni Oluştur</h2>
          <button
            onClick={onClose}
            className="text-[#a7a7a7] hover:text-white pressable"
          >
            <X size={20} />
          </button>
        </div>

        <TypePicker value={collectionType} onChange={setCollectionType} />

        {/* Cover placeholder */}
        <div
          className="w-20 h-20 mx-auto mb-5 rounded-lg flex items-center justify-center shadow-xl"
          style={{
            background: isAlbum
              ? "linear-gradient(135deg,#0a3d1e,#1db954)"
              : "linear-gradient(135deg,#450af5,#c4efd9)",
          }}
        >
          {isAlbum ? (
            <Disc3 size={32} className="text-white/80" />
          ) : (
            <Music2 size={32} className="text-white/80" />
          )}
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={isAlbum ? "Albüm adı" : "Liste adı"}
            maxLength={80}
            className="w-full bg-[#282828] text-white placeholder-[#535353] rounded-md px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#1db954]"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={
              isAlbum
                ? "Albüm açıklaması (isteğe bağlı)"
                : "Açıklama (isteğe bağlı)"
            }
            maxLength={200}
            className="w-full bg-[#282828] text-white placeholder-[#535353] rounded-md px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#1db954]"
          />
          {err && <p className="text-red-400 text-xs">{err}</p>}
        </div>

        <button
          onClick={submit}
          disabled={saving || !title.trim()}
          className="mt-5 w-full bg-[#1db954] text-black font-bold rounded-full py-3 text-sm hover:bg-[#1ed760] transition-colors pressable disabled:opacity-40"
        >
          {saving
            ? "Oluşturuluyor..."
            : isAlbum
              ? "Albüm Oluştur"
              : "Liste Oluştur"}
        </button>
      </div>
    </div>
  );
}

// ── Card / Row components ─────────────────────────────────────────────────────

function CollectionCover({
  playlist,
  size,
}: {
  playlist: Playlist;
  size: number;
}) {
  const isAlbum = playlist.type === "album";
  if (playlist.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={playlist.coverUrl}
        alt={playlist.title}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background: isAlbum
          ? "linear-gradient(135deg,#0a3d1e,#1db954)"
          : "linear-gradient(135deg,#450af5,#c4efd9)",
      }}
    >
      {isAlbum ? (
        <Disc3 size={size} className="text-white/80" />
      ) : (
        <Music2 size={size} className="text-white/80" />
      )}
    </div>
  );
}

function CollectionRow({ playlist }: { playlist: Playlist }) {
  const isAlbum = playlist.type === "album";
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-md hover:bg-[#ffffff1a] transition-colors group pressable"
    >
      <div
        className="w-14 h-14 flex-shrink-0 overflow-hidden shadow-md"
        style={{ borderRadius: isAlbum ? 4 : 4 }}
      >
        <CollectionCover playlist={playlist} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">
          {playlist.title}
        </p>
        <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
          {isAlbum ? "Albüm" : "Çalma listesi"} · {playlist.songCount ?? 0}{" "}
          şarkı
        </p>
      </div>
      <ChevronRight
        size={16}
        className="text-[#535353] group-hover:text-[#a7a7a7] transition-colors flex-shrink-0"
      />
    </Link>
  );
}

function CollectionCard({ playlist }: { playlist: Playlist }) {
  const isAlbum = playlist.type === "album";
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="bg-[#181818] hover:bg-[#282828] rounded-lg p-4 transition-colors group pressable"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden shadow-xl mb-4">
        <CollectionCover playlist={playlist} size={40} />
        <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
          {isAlbum ? (
            <Disc3 size={16} className="text-black" />
          ) : (
            <ListMusic size={16} className="text-black" />
          )}
        </div>
      </div>
      <p className="text-white text-sm font-semibold truncate">
        {playlist.title}
      </p>
      <p className="text-[#a7a7a7] text-xs truncate mt-0.5">
        {isAlbum ? "Albüm" : "Çalma listesi"} · {playlist.songCount ?? 0} şarkı
      </p>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  color,
  items,
  viewMode,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  items: Playlist[];
  viewMode: "list" | "grid";
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 px-4 mb-2">
        <Icon size={16} style={{ color }} />
        <h2 className="text-white text-sm font-bold uppercase tracking-widest">
          {title}
        </h2>
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: color + "22", color }}
        >
          {items.length}
        </span>
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-2">
          {items.map((p) => (
            <CollectionCard key={p.id} playlist={p} />
          ))}
        </div>
      ) : (
        <div>
          {items.map((p) => (
            <CollectionRow key={p.id} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  const handleCreated = (p: Playlist) => {
    setPlaylists((prev) => [p, ...prev]);
  };

  const filtered = search.trim()
    ? playlists.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      )
    : playlists;

  const albums = filtered.filter((p) => p.type === "album");
  const lists = filtered.filter((p) => p.type !== "album");

  // ── Not logged in ──
  if (!loading && status === "unauthenticated") {
    return (
      <div className="min-h-full bg-[#121212]">
        <div className="bg-gradient-to-b from-[#3d3d3d] to-[#121212] pt-16 md:pt-20 px-6 pb-8">
          <h1 className="text-white text-3xl font-black mb-1">Kütüphanem</h1>
          <p className="text-[#a7a7a7] text-sm">
            Albümlerin ve listeler burada
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mb-6">
            <ListMusic size={36} className="text-[#535353]" />
          </div>
          <h2 className="text-white text-2xl font-black mb-2">
            Koleksiyonun burada görünür
          </h2>
          <p className="text-[#a7a7a7] text-sm mb-8 max-w-xs">
            Giriş yap, albüm ve listelerini oluştur.
          </p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="bg-white text-black font-bold rounded-full px-8 py-3 text-sm hover:bg-[#ffffffcc] transition-colors pressable"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-full bg-[#121212]">
        <div className="bg-gradient-to-b from-[#3d3d3d] to-[#121212] pt-16 md:pt-20 px-6 pb-8">
          <div className="h-9 w-40 rounded-full shimmer mb-2" />
          <div className="h-4 w-24 rounded-full shimmer" />
        </div>
        <div className="px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-14 h-14 rounded shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded-full shimmer" />
                <div className="h-3 w-1/3 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-[#121212]">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-b from-[#3d3d3d] to-[#121212] pt-16 md:pt-20 px-6 pb-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-white text-3xl font-black mb-1">
                Kütüphanem
              </h1>
              <p className="text-[#a7a7a7] text-sm">
                {playlists.length > 0
                  ? `${albums.length} albüm · ${lists.length} liste`
                  : "Henüz koleksiyon yok"}
              </p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center pressable hover:scale-105 transition-transform shadow-lg"
              title="Yeni oluştur"
            >
              <Plus size={20} className="text-black" />
            </button>
          </div>
        </div>

        {playlists.length > 0 && (
          <div className="px-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a7a7a7]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Koleksiyonunda ara"
                  className="w-full bg-[#282828] text-white placeholder-[#535353] rounded-md pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#1db954]"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a7a7a7] hover:text-white pressable"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "grid" : "list")
                }
                className="w-9 h-9 rounded-md bg-[#282828] flex items-center justify-center text-[#a7a7a7] hover:text-white transition-colors pressable flex-shrink-0"
              >
                {viewMode === "list" ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <rect x="0" y="0" width="4" height="4" rx="0.5" />
                    <rect x="6" y="0" width="4" height="4" rx="0.5" />
                    <rect x="12" y="0" width="4" height="4" rx="0.5" />
                    <rect x="0" y="6" width="4" height="4" rx="0.5" />
                    <rect x="6" y="6" width="4" height="4" rx="0.5" />
                    <rect x="12" y="6" width="4" height="4" rx="0.5" />
                    <rect x="0" y="12" width="4" height="4" rx="0.5" />
                    <rect x="6" y="12" width="4" height="4" rx="0.5" />
                    <rect x="12" y="12" width="4" height="4" rx="0.5" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <rect x="0" y="1" width="16" height="2.5" rx="1" />
                    <rect x="0" y="6.5" width="16" height="2.5" rx="1" />
                    <rect x="0" y="12" width="16" height="2.5" rx="1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="px-4 pb-4">
          {filtered.length === 0 && search ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Search size={36} className="text-[#535353] mb-3" />
              <p className="text-white font-semibold mb-1">
                &quot;{search}&quot; için sonuç bulunamadı
              </p>
              <button
                onClick={() => setSearch("")}
                className="text-[#a7a7a7] hover:text-white text-sm mt-2 pressable"
              >
                Aramayı temizle
              </button>
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center py-16 px-6 text-center">
              <div className="flex gap-3 mb-6">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-[#0a3d1e]">
                  <Disc3 size={28} className="text-[#1db954]" />
                </div>
                <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-[#1a1460]">
                  <ListMusic size={28} className="text-[#477D95]" />
                </div>
              </div>
              <h2 className="text-white text-xl font-black mb-2">
                Henüz koleksiyonun yok
              </h2>
              <p className="text-[#a7a7a7] text-sm mb-8 max-w-xs">
                Albüm oluştur — kendi ürettiğin şarkıları bir araya getir. Ya da
                çalma listesiyle başla.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="bg-white text-black font-bold rounded-full px-8 py-3 text-sm hover:bg-[#ffffffcc] transition-colors pressable"
              >
                İlkini oluştur
              </button>
            </div>
          ) : (
            <>
              <Section
                title="Albümlerim"
                icon={Disc3}
                color="#1db954"
                items={albums}
                viewMode={viewMode}
              />
              <Section
                title="Çalma Listelerim"
                icon={ListMusic}
                color="#477D95"
                items={lists}
                viewMode={viewMode}
              />
            </>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreated}
        />
      )}
    </>
  );
}
