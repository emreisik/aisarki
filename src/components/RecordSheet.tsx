"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import {
  Mic,
  Square,
  X,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Phase =
  | "idle"
  | "permission"
  | "recording"
  | "preview"
  | "denied"
  | "unsupported";

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/mpeg",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function RecordSheet() {
  const { recordOpen, closeRecord, setPending } = useUpload();
  const { plan } = useCredits();
  const { status } = useSession();
  const router = useRouter();

  const maxSec = (plan?.features.uploadMaxMinutes ?? 8) * 60;

  const [phase, setPhase] = useState<Phase>("idle");
  const [duration, setDuration] = useState(0);
  const [closing, setClosing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mimeRef = useRef<string>("");

  const stopAll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* zaten durmuş olabilir */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopAll();
    chunksRef.current = [];
    blobRef.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setDuration(0);
    setPreviewing(false);
    setPhase("idle");
  }, [stopAll, previewUrl]);

  useEffect(() => {
    if (!recordOpen) {
      reset();
    }
    return () => {
      if (!recordOpen) return;
      stopAll();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordOpen]);

  const dismiss = useCallback(() => {
    if (phase === "recording") return;
    setClosing(true);
    setTimeout(() => {
      reset();
      setClosing(false);
      closeRecord();
    }, 240);
  }, [phase, reset, closeRecord]);

  const drawFrame = useCallback(() => {
    const an = analyserRef.current;
    const canvas = canvasRef.current;
    if (!an || !canvas) {
      rafRef.current = requestAnimationFrame(drawFrame);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const buf = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(buf);

    const bars = 56;
    const gap = 3;
    const totalGap = gap * (bars - 1);
    const barW = (cssW - totalGap) / bars;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * buf.length * 0.8);
      const v = buf[idx] / 255;
      const bh = Math.max(3, v * cssH * 0.95);
      const y = (cssH - bh) / 2;
      const x = i * (barW + gap);
      const grad = ctx.createLinearGradient(0, y, 0, y + bh);
      grad.addColorStop(0, "#fcff9a");
      grad.addColorStop(0.4, "#1ed760");
      grad.addColorStop(1, "#19b35c");
      ctx.fillStyle = grad;
      const r = Math.min(barW / 2, 3);
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bh, r);
      ctx.fill();
    }
    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const startRecording = useCallback(async () => {
    if (status !== "authenticated") {
      router.push("/auth/signin");
      return;
    }
    if (
      typeof window === "undefined" ||
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setPhase("unsupported");
      return;
    }
    setPhase("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mime = pickMime();
      mimeRef.current = mime;
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = mime || rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPhase("preview");
      };
      rec.onerror = () => {
        setPhase("denied");
        stopAll();
      };

      const AC: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ac = new AC();
      audioCtxRef.current = ac;
      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.75;
      src.connect(an);
      analyserRef.current = an;

      rec.start(250);
      startTsRef.current = Date.now();
      setDuration(0);
      setPhase("recording");

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= maxSec) {
          finishRecording();
        }
      }, 250);
      rafRef.current = requestAnimationFrame(drawFrame);
    } catch (e) {
      const err = e as { name?: string };
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setPhase("denied");
      } else {
        setPhase("unsupported");
      }
      stopAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, maxSec, drawFrame, stopAll]);

  const finishRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* zaten durmuş olabilir */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const togglePreview = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (previewing) {
      el.pause();
      setPreviewing(false);
    } else {
      el.play().catch(() => {});
      setPreviewing(true);
    }
  };

  const restart = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    setPhase("idle");
    setTimeout(() => startRecording(), 80);
  };

  const confirm = () => {
    const blob = blobRef.current;
    if (!blob) return;
    const mime = mimeRef.current || blob.type || "audio/webm";
    let ext = "webm";
    if (mime.includes("mp4") || mime.includes("aac")) ext = "m4a";
    else if (mime.includes("mpeg")) ext = "mp3";
    const file = new File([blob], `kayit-${Date.now()}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });
    setPending({ file, startedAt: Date.now() });
    reset();
    closeRecord();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/create")
    ) {
      router.push("/create");
    }
  };

  if (!recordOpen && !closing) return null;

  const progressPct = Math.min(100, (duration / maxSec) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm ${
          closing ? "backdrop-exit" : "backdrop-enter"
        }`}
        onClick={dismiss}
      />
      <div
        className={`relative z-10 w-full sm:max-w-[520px] bg-[#161616] rounded-t-[20px] sm:rounded-[20px] flex flex-col border border-[#222] shadow-2xl ${
          closing ? "sheet-exit" : "sheet-enter"
        }`}
      >
        <div className="flex justify-center pt-[10px] pb-[6px] sm:hidden">
          <div className="w-[36px] h-[4px] rounded-full bg-[#333]" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <div>
            <h2 className="text-white text-[16px] font-bold">Sesini kaydet</h2>
            <p className="text-[#666] text-[12px] mt-0.5">
              Maks {Math.floor(maxSec / 60)} dk · {plan?.name ?? "Free Plan"}
            </p>
          </div>
          <button
            onClick={dismiss}
            disabled={phase === "recording"}
            className="w-9 h-9 rounded-full bg-[#222] hover:bg-[#2a2a2a] flex items-center justify-center pressable disabled:opacity-40"
            aria-label="Kapat"
          >
            <X size={14} className="text-[#aaa]" />
          </button>
        </div>

        <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
          {phase === "unsupported" && (
            <div className="bg-[#1a1a1a] rounded-2xl p-7 flex flex-col items-center text-center">
              <AlertCircle size={28} className="text-amber-400 mb-3" />
              <p className="text-white text-[15px] font-semibold mb-1">
                Tarayıcı desteklemiyor
              </p>
              <p className="text-[#888] text-[13px] max-w-[300px]">
                Modern bir tarayıcıdan dene veya dosya yükleme seçeneğini
                kullan.
              </p>
              <button
                onClick={dismiss}
                className="mt-5 px-5 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white text-[13px] font-semibold pressable"
              >
                Tamam
              </button>
            </div>
          )}

          {phase === "denied" && (
            <div className="bg-[#1a1a1a] rounded-2xl p-7 flex flex-col items-center text-center">
              <AlertCircle size={28} className="text-red-400 mb-3" />
              <p className="text-white text-[15px] font-semibold mb-1">
                Mikrofon izni reddedildi
              </p>
              <p className="text-[#888] text-[13px] max-w-[320px]">
                Tarayıcı ayarlarından bu site için mikrofon iznini etkinleştir
                ve tekrar dene.
              </p>
              <button
                onClick={() => setPhase("idle")}
                className="mt-5 px-5 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white text-[13px] font-semibold pressable"
              >
                Tekrar dene
              </button>
            </div>
          )}

          {(phase === "idle" || phase === "permission") && (
            <div className="bg-[#1a1a1a] rounded-2xl p-7 flex flex-col items-center">
              <div className="text-[#666] text-[11px] uppercase tracking-[0.15em] mb-5">
                Hazır
              </div>
              <button
                onClick={startRecording}
                disabled={phase === "permission"}
                className="relative w-[96px] h-[96px] rounded-full flex items-center justify-center pressable active:scale-95 transition-transform disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, #1ed760 0%, #19b35c 60%, #0d7a3a 100%)",
                  boxShadow: "0 12px 40px rgba(30, 215, 96, 0.35)",
                }}
              >
                <span className="absolute inset-0 rounded-full mic-pulse" />
                {phase === "permission" ? (
                  <Loader2 size={34} className="text-black animate-spin" />
                ) : (
                  <Mic size={34} className="text-black" />
                )}
              </button>
              <p className="text-[#aaa] text-[13px] mt-5">
                {phase === "permission"
                  ? "Mikrofon izni isteniyor..."
                  : "Kaydı başlatmak için bas"}
              </p>
            </div>
          )}

          {phase === "recording" && (
            <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-[15px] font-bold tabular-nums">
                  {fmt(duration)}
                </span>
                <span className="text-[#555] text-[12px] tabular-nums">
                  / {fmt(maxSec)}
                </span>
              </div>

              <canvas
                ref={canvasRef}
                className="w-full h-[88px] rounded-xl bg-[#0d0d0d]"
              />

              <div
                className="mt-3 w-full h-[3px] rounded-full bg-[#222] overflow-hidden"
                aria-hidden
              >
                <div
                  className="h-full bg-[#1ed760] transition-[width] duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <button
                onClick={finishRecording}
                className="mt-6 w-[88px] h-[88px] rounded-full bg-red-500 flex items-center justify-center pressable active:scale-95 transition-transform"
                style={{
                  boxShadow: "0 10px 32px rgba(239, 68, 68, 0.4)",
                }}
                aria-label="Kaydı bitir"
              >
                <Square size={24} className="text-white" fill="white" />
              </button>
              <p className="text-[#888] text-[13px] mt-4">Bitirmek için bas</p>
            </div>
          )}

          {phase === "preview" && previewUrl && (
            <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-white text-[15px] font-bold tabular-nums">
                  {fmt(duration)}
                </span>
                <span className="text-[#555] text-[12px]">kayıt hazır</span>
              </div>

              <button
                onClick={togglePreview}
                className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center pressable active:scale-95 transition-transform mb-4"
                style={{ boxShadow: "0 8px 24px rgba(255,255,255,0.12)" }}
                aria-label={previewing ? "Duraklat" : "Çal"}
              >
                {previewing ? (
                  <Pause size={26} fill="black" className="text-black" />
                ) : (
                  <Play
                    size={26}
                    fill="black"
                    className="text-black ml-[3px]"
                  />
                )}
              </button>
              <audio
                ref={audioElRef}
                src={previewUrl}
                onEnded={() => setPreviewing(false)}
                preload="auto"
                className="hidden"
              />

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={restart}
                  className="flex-1 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white text-[14px] font-semibold flex items-center justify-center gap-2 pressable transition-colors"
                >
                  <RotateCcw size={15} />
                  Yeniden
                </button>
                <button
                  onClick={confirm}
                  className="flex-1 h-12 rounded-full text-white text-[14px] font-bold flex items-center justify-center gap-2 pressable active:scale-95 transition-transform"
                  style={
                    {
                      background:
                        "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)",
                    } as CSSProperties
                  }
                >
                  <Check size={16} />
                  Kullan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
