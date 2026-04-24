"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PendingUpload = {
  file: File;
  startedAt: number;
} | null;

type UploadCtx = {
  pending: PendingUpload;
  setPending: (p: PendingUpload) => void;
  recordOpen: boolean;
  openRecord: () => void;
  closeRecord: () => void;
};

const Ctx = createContext<UploadCtx | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingUpload>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{
        pending,
        setPending,
        recordOpen,
        openRecord: () => setRecordOpen(true),
        closeRecord: () => setRecordOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUpload() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUpload must be used within UploadProvider");
  return c;
}
