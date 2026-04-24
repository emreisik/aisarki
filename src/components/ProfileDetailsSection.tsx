"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Loader2,
  Trash2,
  Check,
  X,
  Plus,
  Image as ImageIcon,
} from "lucide-react";

type Props = {
  username: string;
  onMessage: (msg: { type: "success" | "error"; text: string }) => void;
};

export default function ProfileDetailsSection({ username, onMessage }: Props) {
  const [bio, setBio] = useState("");
  const [bioInitial, setBioInitial] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [genreTagsInitial, setGenreTagsInitial] = useState<string[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${username}`);
      if (!res.ok) return;
      const d = await res.json();
      setBio(d.bio ?? "");
      setBioInitial(d.bio ?? "");
      const tags = d.genreTagsAuto ? [] : (d.genreTags ?? []);
      setGenreTags(tags);
      setGenreTagsInitial(tags);
      setBannerUrl(d.bannerUrl ?? null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty =
    bio.trim() !== bioInitial.trim() ||
    JSON.stringify([...genreTags].sort()) !==
      JSON.stringify([...genreTagsInitial].sort());

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
          genreTags: genreTags.slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onMessage({ type: "error", text: data.error || "Kaydedilemedi" });
        return;
      }
      setBioInitial(bio);
      setGenreTagsInitial(genreTags);
      onMessage({ type: "success", text: "Profil güncellendi" });
    } catch {
      onMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const v = newTag.trim().toLowerCase();
    if (!v || v.length > 30) return;
    if (genreTags.includes(v)) {
      setNewTag("");
      return;
    }
    if (genreTags.length >= 10) {
      onMessage({ type: "error", text: "En fazla 10 etiket eklenebilir" });
      return;
    }
    setGenreTags([...genreTags, v]);
    setNewTag("");
  };

  const removeTag = (t: string) => {
    setGenreTags(genreTags.filter((x) => x !== t));
  };

  const uploadBanner = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      onMessage({ type: "error", text: "Banner 8MB'dan büyük olamaz" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/banner", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        onMessage({ type: "error", text: data.error || "Yükleme başarısız" });
        return;
      }
      setBannerUrl(data.url);
      onMessage({ type: "success", text: "Banner güncellendi" });
    } catch {
      onMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setUploading(false);
    }
  };

  const removeBanner = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/banner", { method: "DELETE" });
      if (res.ok) {
        setBannerUrl(null);
        onMessage({ type: "success", text: "Banner kaldırıldı" });
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#555]" />
      </div>
    );
  }

  return (
    <div className="mt-6 bg-[#141414] border border-[#1f1f1f] rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <ImageIcon size={16} className="text-[#888]" />
        <div>
          <p className="text-white text-[15px] font-semibold">
            Profil detayları
          </p>
          <p className="text-[#666] text-[12px] mt-0.5">
            Banner, bio ve favori türler profil sayfanda görünür
          </p>
        </div>
      </div>

      {/* Banner */}
      <div className="mb-6">
        <label className="text-[#888] text-[12px] font-medium uppercase tracking-wide mb-2 block">
          Banner
        </label>
        <div className="relative w-full h-40 rounded-xl overflow-hidden bg-[#0e0e0e] border border-[#2a2a2a]">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#444] text-[12px]">
              Banner yüklenmedi — avatar renginden gradient gösterilir
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 px-3 rounded-full bg-black/70 hover:bg-black/90 text-white text-[12px] font-semibold flex items-center gap-1.5 pressable disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Camera size={12} />
              )}
              {bannerUrl ? "Değiştir" : "Yükle"}
            </button>
            {bannerUrl && (
              <button
                onClick={removeBanner}
                disabled={uploading}
                className="h-9 w-9 rounded-full bg-black/70 hover:bg-red-500/40 text-white flex items-center justify-center pressable disabled:opacity-50"
                aria-label="Kaldır"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadBanner(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Bio */}
      <div className="mb-6">
        <label className="text-[#888] text-[12px] font-medium uppercase tracking-wide mb-2 block">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Kendini birkaç cümleyle tanıt..."
          className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-[14px] placeholder-[#555] focus:outline-none focus:border-[#3a3a3a] resize-none transition-colors"
        />
        <p className="text-[#555] text-[11px] mt-1">{bio.length} / 500</p>
      </div>

      {/* Genre tags */}
      <div className="mb-6">
        <label className="text-[#888] text-[12px] font-medium uppercase tracking-wide mb-2 block">
          Favori türler
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {genreTags.map((t) => (
            <span
              key={t}
              className="h-8 pl-3 pr-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-[13px] font-medium flex items-center gap-1"
            >
              {t}
              <button
                onClick={() => removeTag(t)}
                className="w-6 h-6 rounded-full hover:bg-[#2a2a2a] flex items-center justify-center"
                aria-label={`${t} kaldır`}
              >
                <X size={11} className="text-[#888]" />
              </button>
            </span>
          ))}
          {genreTags.length === 0 && (
            <p className="text-[#666] text-[12px] italic">
              Boş bırakırsan şarkılarının türlerinden otomatik oluşturulur
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Yeni etiket (ör. arabesk, türk pop)"
            maxLength={30}
            className="flex-1 h-10 bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg px-3 text-white text-[13px] placeholder-[#555] focus:outline-none focus:border-[#3a3a3a] transition-colors"
          />
          <button
            onClick={addTag}
            disabled={!newTag.trim() || genreTags.length >= 10}
            className="h-10 px-4 rounded-lg bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] font-semibold pressable flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus size={12} />
            Ekle
          </button>
        </div>
      </div>

      {/* Save */}
      {dirty && (
        <div className="flex justify-end gap-2 pt-2 border-t border-[#1f1f1f]">
          <button
            onClick={() => {
              setBio(bioInitial);
              setGenreTags(genreTagsInitial);
            }}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] font-semibold pressable disabled:opacity-50"
          >
            Geri al
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-5 rounded-lg bg-[#1db954] hover:bg-[#1ed760] text-black text-[13px] font-bold pressable flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            Kaydet
          </button>
        </div>
      )}
    </div>
  );
}
