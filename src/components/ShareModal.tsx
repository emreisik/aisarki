"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Mail } from "lucide-react";
import {
  shareVia,
  type ShareChannel,
  type ShareTarget,
  copyToClipboard,
} from "@/lib/shareUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  target: ShareTarget;
};

const CHANNELS: {
  id: Exclude<ShareChannel, "copy" | "native">;
  label: string;
  bg: string;
  svg: React.ReactNode;
}[] = [
  {
    id: "x",
    label: "X",
    bg: "#000",
    svg: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.821l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    bg: "#1877f2",
    svg: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    bg: "#0a66c2",
    svg: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: "reddit",
    label: "Reddit",
    bg: "#ff4500",
    svg: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
        <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-6.5-1.5a2 2 0 00-3.4-1.4c-1-.6-2.3-1-3.6-1.1l.6-3 2.1.5a1.5 1.5 0 102.2-1.3 1.5 1.5 0 00-1.8.2l-2.6-.6a.3.3 0 00-.3.2l-.7 3.4c-1.3 0-2.6.5-3.6 1.1a2 2 0 10-2.8 2.9 4 4 0 000 .6c0 2.9 3.3 5.2 7.4 5.2s7.4-2.3 7.4-5.2a4 4 0 000-.6 2 2 0 001.1-1.9zm-12 1.3a1.4 1.4 0 112.8 0 1.4 1.4 0 01-2.8 0zm7.7 3.6a.3.3 0 010 .4 5 5 0 01-2.9.8 5 5 0 01-2.9-.8.3.3 0 11.4-.4 4.4 4.4 0 002.5.6c.9 0 1.8-.2 2.6-.6.1-.1.2 0 .3 0zm-.3-2.2a1.4 1.4 0 111.4-1.4 1.4 1.4 0 01-1.4 1.4z" />
      </svg>
    ),
  },
];

export default function ShareModal({ open, onClose, target }: Props) {
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

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
      setCopied(false);
      onClose();
    }, 200);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(target.url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${closing ? "backdrop-exit" : "backdrop-enter"}`}
        onClick={dismiss}
      />
      <div
        className={`relative z-10 w-full max-w-[520px] bg-[#161616] border border-[#222] rounded-[20px] p-6 shadow-2xl ${closing ? "modal-exit" : "modal-enter"}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-[18px] font-bold">Paylaş</h2>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-full bg-[#222] hover:bg-[#2a2a2a] flex items-center justify-center pressable"
            aria-label="Kapat"
          >
            <X size={14} className="text-[#aaa]" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              onClick={() => shareVia(c.id, target)}
              className="flex flex-col items-center gap-2 pressable group"
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: c.bg }}
              >
                {c.svg}
              </span>
              <span className="text-[11px] text-[#bbb]">{c.label}</span>
            </button>
          ))}
          <button
            onClick={() => shareVia("email", target)}
            className="flex flex-col items-center gap-2 pressable group"
          >
            <span className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center transition-transform group-hover:scale-105">
              <Mail size={18} className="text-white" />
            </span>
            <span className="text-[11px] text-[#bbb]">E-posta</span>
          </button>
        </div>

        <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl flex items-center gap-3 p-3">
          <div className="flex-1 min-w-0 text-[13px] text-[#bbb] truncate">
            {target.url}
          </div>
          <button
            onClick={handleCopy}
            className="h-9 px-4 rounded-full bg-white hover:bg-[#f0f0f0] text-black text-[13px] font-bold pressable flex items-center gap-1.5"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>
    </div>
  );
}
