"use client";

import { useSession } from "next-auth/react";
import { handleSignOut } from "@/lib/authUtils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongCard from "@/components/SongCard";
import { Song } from "@/types";
import { useLikedIds } from "@/hooks/useLikedIds";
import {
  LogOut,
  Music2,
  User,
  ChevronRight,
  Mail,
  Lock,
  AtSign,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface Stats {
  followerCount: number;
  followingCount: number;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} B`;
  return String(n);
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { playSong, currentSong } = usePlayer();
  const { likedIds, toggleLiked } = useLikedIds();
  const [songs, setSongs] = useState<Song[]>([]);
  const [stats, setStats] = useState<Stats>({
    followerCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Ayarlar state
  const [showSettings, setShowSettings] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Şifre değiştirme
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const username = (session?.user as { username?: string })?.username;

    Promise.all([
      fetch("/api/all-songs?limit=1000")
        .then((r) => r.json())
        .then((d) => setSongs(d.songs || [])),
      username
        ? fetch(`/api/profile/${username}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.followerCount !== undefined) {
                setStats({
                  followerCount: d.followerCount,
                  followingCount: d.followingCount,
                });
              }
            })
        : Promise.resolve(),
    ]).finally(() => setLoading(false));

    fetch("/api/songs/heal", { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }, [status]);

  const startEdit = (field: string, current: string) => {
    setEditField(field);
    setEditValue(current);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue("");
  };

  const saveField = async (field: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {};
      if (field === "displayName") body.displayName = editValue;
      if (field === "username") body.username = editValue;

      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }
      setMessage({ type: "success", text: "Güncellendi" });
      setEditField(null);
      updateSession();
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }
      setMessage({ type: "success", text: "Şifre değiştirildi" });
      setCurrentPw("");
      setNewPw("");
      setEditField(null);
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setPwSaving(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session!.user!;
  const username = (user as { username?: string }).username;
  const email = user.email;

  return (
    <div className="min-h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a3a1a] to-[#0a0a0a] pt-4 px-6 pb-6">
        <div className="flex items-end gap-5">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#282828] flex-shrink-0 overflow-hidden shadow-2xl">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={40} className="text-[#535353]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
              Profil
            </p>
            <h1 className="text-white text-3xl md:text-5xl font-black truncate">
              {user.name || username}
            </h1>
            {username && (
              <p className="text-white/50 text-sm mt-1">@{username}</p>
            )}
            {!loading && (
              <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                <span>
                  <span className="text-white font-bold">
                    {fmtCount(stats.followerCount)}
                  </span>{" "}
                  takipçi
                </span>
                <span>
                  <span className="text-white font-bold">
                    {fmtCount(stats.followingCount)}
                  </span>{" "}
                  takip
                </span>
                <span>
                  <span className="text-white font-bold">{songs.length}</span>{" "}
                  şarkı
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 border rounded-full px-4 py-1.5 text-sm font-semibold transition-colors pressable ${
              showSettings
                ? "bg-white text-black border-white"
                : "border-white/20 text-white hover:border-white/50"
            }`}
          >
            {showSettings ? <X size={14} /> : <Pencil size={14} />}
            {showSettings ? "Kapat" : "Hesap Ayarları"}
          </button>
          <button
            onClick={() => handleSignOut()}
            className="flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 text-white/50 text-sm font-semibold hover:text-white hover:border-white/30 transition-colors pressable"
          >
            <LogOut size={14} />
            Çıkış
          </button>
        </div>
      </div>

      {/* ── Hesap Ayarları ── */}
      {showSettings && (
        <div className="px-6 pb-8">
          <h2 className="text-white font-bold text-lg mb-4">Hesap Ayarları</h2>

          {/* Mesaj */}
          {message && (
            <div
              className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${
                message.type === "success"
                  ? "bg-[#1db954]/15 text-[#1db954]"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {/* Görünen Ad */}
            <SettingsRow
              icon={User}
              label="Görünen Ad"
              value={user.name || ""}
              editing={editField === "displayName"}
              editValue={editValue}
              onEdit={() => startEdit("displayName", user.name || "")}
              onCancel={cancelEdit}
              onSave={() => saveField("displayName")}
              onChange={setEditValue}
              saving={saving}
            />

            {/* Kullanıcı Adı */}
            <SettingsRow
              icon={AtSign}
              label="Kullanıcı Adı"
              value={username || ""}
              editing={editField === "username"}
              editValue={editValue}
              onEdit={() => startEdit("username", username || "")}
              onCancel={cancelEdit}
              onSave={() => saveField("username")}
              onChange={setEditValue}
              saving={saving}
            />

            {/* E-posta (salt okunur) */}
            <div className="flex items-center gap-4 py-4 border-b border-white/5">
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                  E-posta
                </p>
                <p className="text-white/70 text-[14px] truncate">
                  {email || "—"}
                </p>
              </div>
              <span className="text-white/20 text-[11px]">Değiştirilemez</span>
            </div>

            {/* Şifre Değiştir */}
            <div className="py-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                    Şifre
                  </p>
                  <p className="text-white/70 text-[14px]">••••••••••</p>
                </div>
                {editField !== "password" ? (
                  <button
                    onClick={() => {
                      setEditField("password");
                      setMessage(null);
                    }}
                    className="text-[#1db954] text-[12px] font-semibold pressable"
                  >
                    Değiştir
                  </button>
                ) : (
                  <button
                    onClick={cancelEdit}
                    className="text-white/40 text-[12px] pressable"
                  >
                    İptal
                  </button>
                )}
              </div>

              {editField === "password" && (
                <div className="mt-4 ml-[52px] space-y-3">
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Mevcut şifre"
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-[14px] placeholder-white/20 border border-white/10 focus:border-white/30 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Yeni şifre (min 10 karakter)"
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-[14px] placeholder-white/20 border border-white/10 focus:border-white/30 focus:outline-none"
                  />
                  <button
                    onClick={changePassword}
                    disabled={pwSaving || !currentPw || newPw.length < 10}
                    className="px-5 py-2.5 rounded-xl bg-[#1db954] text-black text-[13px] font-bold pressable disabled:opacity-40"
                  >
                    {pwSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Şifreyi Güncelle"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Songs */}
      <div className="px-6 pb-8">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Music2 size={18} className="text-[#1db954]" />
          Şarkılarım
          {!loading && songs.length > 0 && (
            <span className="text-white/40 font-normal text-sm">
              {songs.length} şarkı
            </span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-16">
            <Music2 size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Henüz şarkı yok</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isPlaying={currentSong?.id === song.id}
                onPlay={() => playSong(song, songs)}
                onDelete={async (s) => {
                  await fetch(`/api/song/${s.id}`, { method: "DELETE" });
                  setSongs((prev) => prev.filter((x) => x.id !== s.id));
                }}
                variant="row"
                liked={likedIds.has(song.id)}
                onToggleLike={toggleLiked}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Settings Row Bileşeni ── */
function SettingsRow({
  icon: Icon,
  label,
  value,
  editing,
  editValue,
  onEdit,
  onCancel,
  onSave,
  onChange,
  saving,
}: {
  icon: typeof User;
  label: string;
  value: string;
  editing: boolean;
  editValue: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (v: string) => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-white/5">
      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </p>
        {editing ? (
          <input
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-2 mt-1 text-white text-[14px] border border-white/10 focus:border-[#1db954] focus:outline-none"
            autoFocus
          />
        ) : (
          <p className="text-white/70 text-[14px] truncate">{value || "—"}</p>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center pressable"
          >
            {saving ? (
              <Loader2 size={14} className="text-black animate-spin" />
            ) : (
              <Check size={14} className="text-black" />
            )}
          </button>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center pressable"
          >
            <X size={14} className="text-white/60" />
          </button>
        </div>
      ) : (
        <button
          onClick={onEdit}
          className="text-[#1db954] text-[12px] font-semibold pressable"
        >
          Düzenle
        </button>
      )}
    </div>
  );
}
