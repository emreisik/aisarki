"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(undefined);
        startTransition(async () => {
          const res = await loginAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
      className="space-y-3"
    >
      <div>
        <label className="block text-xs text-[var(--text2)] mb-1.5">
          E-posta
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full px-3 py-2.5 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--text2)] mb-1.5">
          Şifre
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full px-3 py-2.5 rounded-md bg-[var(--surface2)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      {error && (
        <div className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-1 py-2.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
