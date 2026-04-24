"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  X,
  Pencil,
  Mail,
  AtSign,
  User,
  Lock,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import ProfileDetailsSection from "@/components/ProfileDetailsSection";
import { handleSignOut } from "@/lib/authUtils";

type Field = "displayName" | "username" | null;

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [editField, setEditField] = useState<Field>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  if (status !== "authenticated") {
    return (
      <SettingsShell title="Hesap">
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#888]" />
        </div>
      </SettingsShell>
    );
  }

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    username?: string;
  };

  const startEdit = (field: Field, value: string) => {
    setEditField(field);
    setEditValue(value);
    setMessage(null);
  };

  const saveField = async () => {
    if (!editField) return;
    const val = editValue.trim();
    if (!val) {
      setMessage({ type: "error", text: "Boş bırakılamaz" });
      return;
    }
    setSaving(true);
    try {
      const body =
        editField === "displayName" ? { displayName: val } : { username: val };
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Hata" });
        return;
      }
      setMessage({ type: "success", text: "Güncellendi" });
      setEditField(null);
      update();
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) {
      setMessage({ type: "error", text: "Tüm alanları doldur" });
      return;
    }
    if (newPw.length < 10) {
      setMessage({
        type: "error",
        text: "Yeni şifre en az 10 karakter olmalı",
      });
      return;
    }
    setPwSaving(true);
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
        setMessage({ type: "error", text: data.error || "Hata" });
        return;
      }
      setMessage({ type: "success", text: "Şifre değiştirildi" });
      setCurrentPw("");
      setNewPw("");
      setShowPwForm(false);
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <SettingsShell
      title="Hesap"
      description="Hesap bilgilerini ve güvenlik ayarlarını yönet"
    >
      {message && (
        <div
          className={`rounded-xl px-4 py-3 mb-4 text-[13px] font-medium ${
            message.type === "success"
              ? "bg-[#1db954]/15 text-[#1ed760] border border-[#1db954]/30"
              : "bg-red-500/15 text-red-400 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl divide-y divide-[#1f1f1f]">
        <Row
          icon={User}
          label="Görünen ad"
          value={user.name || "—"}
          editing={editField === "displayName"}
          editValue={editValue}
          onEditValue={setEditValue}
          onStartEdit={() => startEdit("displayName", user.name || "")}
          onCancel={() => setEditField(null)}
          onSave={saveField}
          saving={saving}
        />
        <Row
          icon={AtSign}
          label="Kullanıcı adı"
          value={user.username ? `@${user.username}` : "—"}
          editing={editField === "username"}
          editValue={editValue}
          onEditValue={setEditValue}
          onStartEdit={() => startEdit("username", user.username || "")}
          onCancel={() => setEditField(null)}
          onSave={saveField}
          saving={saving}
          inputPrefix="@"
          help="3-20 karakter, küçük harf/rakam/alt çizgi"
        />
        <Row
          icon={Mail}
          label="E-posta"
          value={user.email || "—"}
          readOnly
          readOnlyHint="E-posta adresini değiştirmek için destek ile iletişime geç"
        />
      </div>

      {/* Profil detayları — banner / bio / türler */}
      {user.username && (
        <ProfileDetailsSection
          username={user.username}
          onMessage={(m) => setMessage(m)}
        />
      )}

      {/* Şifre */}
      <div className="mt-6 bg-[#141414] border border-[#1f1f1f] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-[#888]" />
            <div>
              <p className="text-white text-[14px] font-semibold">Şifre</p>
              <p className="text-[#666] text-[12px] mt-0.5">
                Güvenlik için düzenli olarak değiştir
              </p>
            </div>
          </div>
          {!showPwForm && (
            <button
              onClick={() => setShowPwForm(true)}
              className="h-9 px-4 rounded-full bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] font-semibold pressable transition-colors flex items-center gap-1.5"
            >
              <Pencil size={12} />
              Değiştir
            </button>
          )}
        </div>

        {showPwForm && (
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Mevcut şifre"
              className="h-11 bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg px-3 text-white text-[14px] placeholder-[#555] focus:outline-none focus:border-[#1db954] transition-colors"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Yeni şifre (en az 10 karakter)"
              className="h-11 bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg px-3 text-white text-[14px] placeholder-[#555] focus:outline-none focus:border-[#1db954] transition-colors"
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPwForm(false);
                  setCurrentPw("");
                  setNewPw("");
                }}
                className="h-10 px-4 rounded-lg bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] font-semibold pressable"
              >
                İptal
              </button>
              <button
                onClick={changePassword}
                disabled={pwSaving}
                className="h-10 px-5 rounded-lg bg-[#1db954] hover:bg-[#1ed760] text-black text-[13px] font-bold pressable transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {pwSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Çıkış */}
      <div className="mt-6 bg-[#141414] border border-[#1f1f1f] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white text-[14px] font-semibold">Oturumu kapat</p>
          <p className="text-[#666] text-[12px] mt-0.5">
            Bu cihazda oturumdan çık
          </p>
        </div>
        <button
          onClick={() => handleSignOut()}
          className="h-10 px-5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 text-[13px] font-semibold pressable transition-colors"
        >
          Çıkış yap
        </button>
      </div>
    </SettingsShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  editing,
  editValue,
  onEditValue,
  onStartEdit,
  onCancel,
  onSave,
  saving,
  inputPrefix,
  help,
  readOnly,
  readOnlyHint,
}: {
  icon: typeof User;
  label: string;
  value: string;
  editing?: boolean;
  editValue?: string;
  onEditValue?: (v: string) => void;
  onStartEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  saving?: boolean;
  inputPrefix?: string;
  help?: string;
  readOnly?: boolean;
  readOnlyHint?: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Icon size={16} className="text-[#888] mt-1 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[#888] text-[12px] font-medium uppercase tracking-wide">
              {label}
            </p>
            {editing ? (
              <div className="mt-1.5 flex items-center gap-2">
                {inputPrefix && (
                  <span className="text-[#666] text-[14px]">{inputPrefix}</span>
                )}
                <input
                  autoFocus
                  value={editValue ?? ""}
                  onChange={(e) => onEditValue?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSave?.();
                    if (e.key === "Escape") onCancel?.();
                  }}
                  className="flex-1 h-10 bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg px-3 text-white text-[14px] placeholder-[#555] focus:outline-none focus:border-[#1db954] transition-colors"
                />
              </div>
            ) : (
              <p className="text-white text-[14px] font-medium mt-0.5 truncate">
                {value}
              </p>
            )}
            {editing && help && (
              <p className="text-[#666] text-[11px] mt-1.5">{help}</p>
            )}
            {readOnly && readOnlyHint && (
              <p className="text-[#666] text-[11px] mt-1">{readOnlyHint}</p>
            )}
          </div>
        </div>

        {!readOnly && !editing && (
          <button
            onClick={onStartEdit}
            className="h-9 px-3.5 rounded-full bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] font-semibold pressable transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <Pencil size={12} />
            Düzenle
          </button>
        )}

        {editing && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={onCancel}
              className="w-9 h-9 rounded-full bg-[#232323] hover:bg-[#2e2e2e] flex items-center justify-center pressable"
              aria-label="İptal"
            >
              <X size={13} className="text-white" />
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="w-9 h-9 rounded-full bg-[#1db954] hover:bg-[#1ed760] flex items-center justify-center pressable disabled:opacity-50"
              aria-label="Kaydet"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin text-black" />
              ) : (
                <Check size={13} className="text-black" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
