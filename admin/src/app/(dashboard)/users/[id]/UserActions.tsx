"use client";

import { useState, useTransition } from "react";
import {
  banUserAction,
  unbanUserAction,
  grantCreditsAction,
  setRoleAction,
  resetPasswordAction,
} from "./actions";
import type { UserRole } from "@/lib/roles";

export default function UserActions({
  userId,
  currentRole,
  isBanned,
  canChangeRole,
}: {
  userId: string;
  currentRole: string;
  isBanned: boolean;
  canChangeRole: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BanPanel userId={userId} isBanned={isBanned} />
      <CreditPanel userId={userId} />
      {canChangeRole && <RolePanel userId={userId} currentRole={currentRole} />}
      <PasswordPanel userId={userId} />
    </div>
  );
}

function PanelShell({
  title,
  description,
  children,
  tone,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "danger" | "warn";
}) {
  const accent =
    tone === "danger"
      ? "border-[var(--danger)]/30"
      : tone === "warn"
        ? "border-[var(--warn)]/30"
        : "border-[var(--border)]";
  return (
    <div className={`rounded-lg border bg-[var(--surface)] p-4 ${accent}`}>
      <div className="mb-3">
        <div className="text-sm font-medium">{title}</div>
        {description && (
          <div className="text-xs text-[var(--text2)] mt-0.5">
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="mt-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/25 rounded px-2.5 py-1.5">
      {msg}
    </div>
  );
}

function SuccessBox({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="mt-2 text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/25 rounded px-2.5 py-1.5">
      {msg}
    </div>
  );
}

// ─── Ban ────────────────────────────────────────────────────────────────────

function BanPanel({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const submit = () => {
    setError(undefined);
    setSuccess(undefined);
    if (!isBanned && !confirm("Kullanıcıyı banlamak istediğine emin misin?"))
      return;
    if (isBanned && !confirm("Banı kaldır?")) return;
    start(async () => {
      const res = isBanned
        ? await unbanUserAction(userId)
        : await banUserAction(userId, reason.trim());
      if (!res.ok) setError(res.error);
      else setSuccess(isBanned ? "Ban kaldırıldı." : "Kullanıcı banlandı.");
    });
  };

  return (
    <PanelShell
      title={isBanned ? "Banı kaldır" : "Kullanıcıyı banla"}
      description={
        isBanned
          ? "Hesap tekrar giriş yapabilir hale gelir."
          : "Hesap login olamaz. Geri alınabilir."
      }
      tone={isBanned ? undefined : "danger"}
    >
      {!isBanned && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Sebep (opsiyonel, audit log'a yazılır)"
          className="w-full mb-2 px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      )}
      <button
        onClick={submit}
        disabled={pending}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60 ${
          isBanned
            ? "bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)]"
            : "bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white"
        }`}
      >
        {pending ? "İşleniyor…" : isBanned ? "Banı kaldır" : "Ban uygula"}
      </button>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
    </PanelShell>
  );
}

// ─── Kredi ──────────────────────────────────────────────────────────────────

function CreditPanel({ userId }: { userId: string }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const submit = () => {
    setError(undefined);
    setSuccess(undefined);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Pozitif sayı gir.");
      return;
    }
    if (!confirm(`${n} addon kredi vermek istediğine emin misin?`)) return;
    start(async () => {
      const res = await grantCreditsAction(userId, Math.floor(n), note.trim());
      if (!res.ok) setError(res.error);
      else {
        setSuccess(`${Math.floor(n)} kredi eklendi.`);
        setAmount("");
        setNote("");
      }
    });
  };

  return (
    <PanelShell
      title="Manuel kredi ver"
      description="Addon kredi olarak eklenir (plan refresh'te yanmaz)."
    >
      <div className="grid grid-cols-[1fr_2fr] gap-2 mb-2">
        <input
          type="number"
          min={1}
          max={10000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Miktar"
          className="px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] tabular-nums"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Not (audit log)"
          className="px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>
      <button
        onClick={submit}
        disabled={pending}
        className="px-3 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
      >
        {pending ? "Ekleniyor…" : "Kredi ekle"}
      </button>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
    </PanelShell>
  );
}

// ─── Rol ────────────────────────────────────────────────────────────────────

const ROLES: UserRole[] = ["user", "support", "admin", "superadmin"];

function RolePanel({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [role, setRole] = useState<UserRole>(currentRole as UserRole);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const submit = () => {
    setError(undefined);
    setSuccess(undefined);
    if (role === currentRole) {
      setError("Rol zaten bu.");
      return;
    }
    if (!confirm(`Rol '${currentRole}' → '${role}' olarak değişsin mi?`))
      return;
    start(async () => {
      const res = await setRoleAction(userId, role);
      if (!res.ok) setError(res.error);
      else setSuccess(`Rol güncellendi: ${role}`);
    });
  };

  return (
    <PanelShell
      title="Rolü değiştir"
      description="Superadmin yetkisi gerektirir. Audit log'a kaydedilir."
      tone="warn"
    >
      <div className="grid grid-cols-[2fr_1fr] gap-2 mb-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="px-3 py-2 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={pending}
          className="px-3 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          Uygula
        </button>
      </div>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
    </PanelShell>
  );
}

// ─── Şifre reset ────────────────────────────────────────────────────────────

function PasswordPanel({ userId }: { userId: string }) {
  const [error, setError] = useState<string | undefined>();
  const [newPass, setNewPass] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const submit = () => {
    setError(undefined);
    setNewPass(undefined);
    if (
      !confirm(
        "Şifreyi sıfırlamak istediğine emin misin? Yeni şifre ekranda BİR KEZ gösterilecek; kaçırırsan tekrar sıfırlaman gerekir.",
      )
    )
      return;
    start(async () => {
      const res = await resetPasswordAction(userId);
      if (!res.ok) setError(res.error);
      else setNewPass(res.newPassword);
    });
  };

  const copy = async () => {
    if (!newPass) return;
    try {
      await navigator.clipboard.writeText(newPass);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sessiz
    }
  };

  return (
    <PanelShell
      title="Şifreyi sıfırla"
      description="Rastgele güçlü bir şifre üretilir ve buradan gösterilir. Kullanıcıya güvenli kanaldan iletin."
      tone="warn"
    >
      {!newPass ? (
        <button
          onClick={submit}
          disabled={pending}
          className="px-3 py-2 rounded-md bg-[var(--warn)] hover:bg-[var(--warn)]/90 text-black text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending ? "Sıfırlanıyor…" : "Şifreyi sıfırla"}
        </button>
      ) : (
        <div>
          <div className="flex items-center gap-2 p-2.5 rounded bg-[var(--surface2)] border border-[var(--border)] font-mono text-sm">
            <span className="flex-1 select-all">{newPass}</span>
            <button
              onClick={copy}
              className="px-2 py-1 rounded bg-[var(--surface3)] hover:bg-[var(--border-strong)] text-xs"
            >
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
          <div className="text-[11px] text-[var(--warn)] mt-1.5">
            Bu şifre artık gösterilmeyecek. Güvenli kanaldan iletin.
          </div>
        </div>
      )}
      <ErrorBox msg={error} />
    </PanelShell>
  );
}
