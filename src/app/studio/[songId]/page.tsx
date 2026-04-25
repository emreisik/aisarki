"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";
import {
  ArrowLeft,
  Play,
  Pause,
  Scissors,
  Volume2,
  Loader2,
  RotateCcw,
  Waves,
  Music2,
  Sparkles,
  Repeat,
  SlidersHorizontal,
  Compass,
  AudioWaveform,
} from "lucide-react";
import type { Song } from "@/types";
import type WaveSurfer from "wavesurfer.js";

/**
 * Stüdyo — Rifmo'nun kendi audio editörü
 * /studio/[songId]
 *
 * Web Audio API + wavesurfer.js ile in-browser ses düzenleme:
 * - Waveform görüntüleme + segment seçimi
 * - Kırpma (segment'i izole et → indir)
 * - Fade in/out
 * - Volume/Gain
 * - Export: WAV (kayıpsız)
 * - Extend olarak kullan (seçili segment'ten Suno ile uzat)
 */

export default function StudioPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<unknown>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [region, setRegion] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [pan, setPan] = useState(0); // -1 sol, 0 merkez, 1 sağ
  const [pitch, setPitch] = useState(0); // semiton cinsinden, -12..+12
  // 6-band parametric EQ — Hz: 60, 230, 910, 3600, 14000 + low-shelf/high-shelf
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [exporting, setExporting] = useState(false);
  const [extending, setExtending] = useState(false);
  const [showEq, setShowEq] = useState(false);

  // Şarkı bilgisini yükle
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/song/${songId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.song && !d.id) {
          setError("Şarkı bulunamadı");
          setLoading(false);
          return;
        }
        setSong(d.song ?? d);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Şarkı yüklenemedi");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  // WaveSurfer + Regions plugin init
  useEffect(() => {
    if (!song || !waveformRef.current) return;
    const playableUrl = song.audioUrl || song.streamUrl;
    if (!playableUrl) {
      setError("Bu şarkının ses dosyası henüz hazır değil");
      return;
    }

    let disposed = false;

    (async () => {
      const { default: WaveSurferCtor } = await import("wavesurfer.js");
      const { default: RegionsPlugin } =
        await import("wavesurfer.js/dist/plugins/regions.esm.js");
      if (disposed || !waveformRef.current) return;

      const regions = RegionsPlugin.create();
      const ws = WaveSurferCtor.create({
        container: waveformRef.current,
        waveColor: "#2a2a2a",
        progressColor: "#19b35c",
        cursorColor: "#fcff9a",
        cursorWidth: 2,
        height: 120,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        url: playableUrl,
        plugins: [regions],
        backend: "WebAudio",
      });

      wsRef.current = ws;
      regionsPluginRef.current = regions;

      ws.on("ready", (d: number) => {
        if (disposed) return;
        setDuration(d);
        // Başlangıç region: ortadaki %50
        const start = d * 0.25;
        const end = d * 0.75;
        regions.addRegion({
          start,
          end,
          color: "rgba(25, 179, 92, 0.15)",
          drag: true,
          resize: true,
        });
        setRegion({ start, end });
      });

      ws.on("play", () => setPlaying(true));
      ws.on("pause", () => setPlaying(false));
      ws.on("finish", () => setPlaying(false));

      regions.on("region-updated", (r: { start: number; end: number }) => {
        setRegion({ start: r.start, end: r.end });
      });
    })();

    return () => {
      disposed = true;
      try {
        wsRef.current?.destroy();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [song]);

  // Volume canlı uygula (preview)
  useEffect(() => {
    wsRef.current?.setVolume(volume / 100);
  }, [volume]);

  const togglePlay = () => {
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.isPlaying()) ws.pause();
    else ws.play();
  };

  const playRegion = () => {
    const ws = wsRef.current;
    if (!ws || !region) return;
    ws.setTime(region.start);
    ws.play();
    // End noktasına geldiğinde durdur
    const checker = setInterval(() => {
      if (!wsRef.current) {
        clearInterval(checker);
        return;
      }
      if (wsRef.current.getCurrentTime() >= region.end) {
        wsRef.current.pause();
        clearInterval(checker);
      }
    }, 50);
  };

  const resetRegion = () => {
    if (!duration) return;
    // Regions'ı sıfırla
    const regions = regionsPluginRef.current as {
      clearRegions?: () => void;
      addRegion?: (o: Record<string, unknown>) => void;
    };
    regions?.clearRegions?.();
    const start = duration * 0.25;
    const end = duration * 0.75;
    regions?.addRegion?.({
      start,
      end,
      color: "rgba(25, 179, 92, 0.15)",
      drag: true,
      resize: true,
    });
    setRegion({ start, end });
    setFadeIn(0);
    setFadeOut(0);
    setVolume(100);
  };

  const renderSegmentToWav = async (): Promise<Blob> => {
    if (!song || !region) throw new Error("region yok");
    const playableUrl = song.audioUrl || song.streamUrl;
    if (!playableUrl) throw new Error("audio url yok");

    // Decode
    const arrayBuffer = await fetch(playableUrl).then((r) => r.arrayBuffer());
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const offlineCtx = new AudioCtx();
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));

    const segDuration = region.end - region.start;
    // Pitch shift: playbackRate ile yapılan basit shift süreyi de etkiler.
    // Frekans / 2^(semitones/12) — yüksek pitch = hızlı çalma + kısa süre.
    const pitchRate = Math.pow(2, pitch / 12);
    const renderDuration = segDuration / pitchRate;
    const segFrames = Math.floor(renderDuration * audioBuffer.sampleRate);
    const offline = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      segFrames,
      audioBuffer.sampleRate,
    );

    const source = offline.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = pitchRate;

    // EQ chain — 6-band parametric
    const eqBands = buildEqChain(offline, eqGains);

    // Pan node (stereo balance)
    const panner = offline.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    // Master gain (volume + fade envelope)
    const gain = offline.createGain();
    const vol = volume / 100;
    gain.gain.value = vol;

    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(vol, Math.min(fadeIn, renderDuration));
    }
    if (fadeOut > 0) {
      const fadeStartTime = Math.max(0, renderDuration - fadeOut);
      gain.gain.setValueAtTime(vol, fadeStartTime);
      gain.gain.linearRampToValueAtTime(0, renderDuration);
    }

    // Bağlama: source → eq[0] → eq[1] → ... → pan → gain → destination
    let prev: AudioNode = source;
    for (const band of eqBands) {
      prev.connect(band);
      prev = band;
    }
    prev.connect(panner).connect(gain).connect(offline.destination);

    source.start(0, region.start, segDuration);

    const rendered = await offline.startRendering();
    await offlineCtx.close();
    return bufferToWav(rendered);
  };

  const handleExport = async () => {
    if (!region || !song || exporting) return;
    setExporting(true);
    try {
      const wav = await renderSegmentToWav();
      const safe = (song.title || "song")
        .replace(/[^\p{L}\p{N}\s.-]+/gu, "")
        .trim()
        .slice(0, 40)
        .replace(/\s+/g, "_");
      const url = URL.createObjectURL(wav);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safe}_edit.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Export sırasında hata oluştu");
    } finally {
      setExporting(false);
    }
  };

  const handleExtendFromRegion = async () => {
    if (!region || !song || extending) return;
    setExtending(true);
    try {
      // Seçili segment'i WAV olarak render et → temp'e yükle → Suno upload-extend
      const wav = await renderSegmentToWav();
      const form = new FormData();
      form.append("file", wav, "segment.wav");
      const upload = await fetch("/api/upload-audio", {
        method: "POST",
        body: form,
      });
      const uploadData = await upload.json();
      if (!upload.ok || !uploadData.url) {
        const e = localizeApiError(uploadData, "Segment yüklenemedi");
        toast.error(e.title, e.message);
        return;
      }

      // Suno upload-extend ile yeni şarkı başlat
      const extend = await fetch("/api/upload-extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadUrl: uploadData.url,
          prompt: song.prompt || song.title,
          style: song.style,
          title: `${song.title} (remix)`,
          continueAt: region.end - region.start,
          model: "V5_5",
        }),
      });
      const extendData = await extend.json();
      if (!extend.ok) {
        const e = localizeApiError(extendData, "Extend başlatılamadı");
        toast.error(e.title, e.message);
        return;
      }
      toast.success(
        "Extend başlatıldı",
        "Create sayfasında ilerlemeyi takip edebilirsin.",
      );
      router.push("/create");
    } catch (e) {
      console.error(e);
      toast.error("Beklenmeyen hata");
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="text-white animate-spin" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
        <p className="text-white text-sm">{error || "Şarkı bulunamadı"}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-full bg-[#1f1f1f] text-white text-[13px]"
        >
          Geri dön
        </button>
      </div>
    );
  }

  const regionDur = region ? region.end - region.start : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full hover:bg-[#1a1a1a] flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-lg font-bold truncate">
              Stüdyo · {song.title}
            </h1>
            <p className="text-[#888] text-xs truncate">
              {song.style || song.prompt || "Rifmo"}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#ec4899] text-white">
            YENİ
          </span>
        </div>

        {/* Waveform */}
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 mb-4">
          <div ref={waveformRef} className="w-full" />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5]"
              >
                {playing ? (
                  <Pause size={16} fill="black" />
                ) : (
                  <Play size={16} fill="black" className="ml-0.5" />
                )}
              </button>
              <button
                onClick={playRegion}
                disabled={!region}
                className="h-9 px-3 rounded-full bg-[#1a1a1a] hover:bg-[#222] text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
                title="Sadece seçili bölümü dinle"
              >
                <Repeat size={12} />
                Bölümü çal
              </button>
              <button
                onClick={resetRegion}
                className="h-9 w-9 rounded-full bg-[#1a1a1a] hover:bg-[#222] text-white flex items-center justify-center"
                title="Sıfırla"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="text-[#888] text-[11px] tabular-nums">
              {region
                ? `${fmt(region.start)} → ${fmt(region.end)} · ${fmt(regionDur)} süre`
                : `${fmt(duration)} süre`}
            </div>
          </div>
        </div>

        {/* Effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <EffectCard
            icon={<Volume2 size={14} />}
            title="Ses (Volume)"
            value={`${volume}%`}
          >
            <input
              type="range"
              min={0}
              max={150}
              step={1}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-[#19b35c]"
            />
          </EffectCard>

          <EffectCard
            icon={<Waves size={14} />}
            title="Fade In"
            value={`${fadeIn.toFixed(1)}s`}
          >
            <input
              type="range"
              min={0}
              max={Math.min(8, regionDur)}
              step={0.1}
              value={fadeIn}
              onChange={(e) => setFadeIn(Number(e.target.value))}
              className="w-full accent-[#19b35c]"
            />
          </EffectCard>

          <EffectCard
            icon={<Waves size={14} className="rotate-180" />}
            title="Fade Out"
            value={`${fadeOut.toFixed(1)}s`}
          >
            <input
              type="range"
              min={0}
              max={Math.min(8, regionDur)}
              step={0.1}
              value={fadeOut}
              onChange={(e) => setFadeOut(Number(e.target.value))}
              className="w-full accent-[#19b35c]"
            />
          </EffectCard>

          <EffectCard
            icon={<Compass size={14} />}
            title="Stereo Pan"
            value={
              pan === 0
                ? "Merkez"
                : pan < 0
                  ? `${Math.round(-pan * 100)}% sol`
                  : `${Math.round(pan * 100)}% sağ`
            }
          >
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={pan}
              onChange={(e) => setPan(Number(e.target.value))}
              className="w-full accent-[#19b35c]"
            />
          </EffectCard>

          <EffectCard
            icon={<AudioWaveform size={14} />}
            title="Pitch (Yarım ton)"
            value={pitch === 0 ? "Normal" : `${pitch > 0 ? "+" : ""}${pitch}`}
          >
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-full accent-[#19b35c]"
            />
          </EffectCard>

          <button
            onClick={() => setShowEq((v) => !v)}
            className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 hover:bg-[#141414] transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-white text-[12px] font-semibold">
                <SlidersHorizontal size={14} />
                6-Band EQ
              </div>
              <span className="text-[#888] text-[11px]">
                {eqGains.some((g) => g !== 0)
                  ? "Aktif"
                  : showEq
                    ? "Gizle"
                    : "Aç"}
              </span>
            </div>
            <p className="text-[#666] text-[11px]">Bas/Mid/Treble dengeleme</p>
          </button>
        </div>

        {/* 6-band EQ panel */}
        {showEq && (
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-[13px] font-semibold flex items-center gap-2">
                <SlidersHorizontal size={14} />
                6-Band Parametric EQ
              </h3>
              <button
                onClick={() => setEqGains([0, 0, 0, 0, 0, 0])}
                className="text-[#888] hover:text-white text-[11px] flex items-center gap-1"
              >
                <RotateCcw size={11} />
                Sıfırla
              </button>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {EQ_BANDS.map((band, idx) => (
                <div
                  key={band.label}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="text-[#888] text-[10px] tabular-nums">
                    {eqGains[idx] > 0 ? "+" : ""}
                    {eqGains[idx]}dB
                  </span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={eqGains[idx]}
                    onChange={(e) => {
                      const next = [...eqGains];
                      next[idx] = Number(e.target.value);
                      setEqGains(next);
                    }}
                    className="h-32 accent-[#19b35c]"
                    style={{
                      writingMode: "vertical-lr" as never,
                      WebkitAppearance: "slider-vertical",
                    }}
                  />
                  <span className="text-white text-[10px] font-semibold">
                    {band.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            disabled={!region || exporting}
            className="h-12 rounded-full bg-white text-black font-semibold hover:bg-[#e5e5e5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Render ediliyor…
              </>
            ) : (
              <>
                <Scissors size={16} />
                Kırp ve İndir (WAV)
              </>
            )}
          </button>

          <button
            onClick={handleExtendFromRegion}
            disabled={!region || extending}
            className="h-12 rounded-full font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background:
                "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)",
            }}
            title="Seçili bölümden itibaren AI ile yeni devamı üret"
          >
            {extending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Başlatılıyor…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Bu Bölümden AI ile Uzat
              </>
            )}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
          <div className="flex items-start gap-3">
            <Music2 size={14} className="text-[#19b35c] flex-shrink-0 mt-0.5" />
            <div className="text-[#888] text-[12px] leading-relaxed">
              <strong className="text-white">Stüdyo ipuçları:</strong> Dalga
              üstündeki yeşil bölgeyi sürükleyerek seçim yap. Sol/sağ kenardan
              tutarak boyutlandır. <em>Bölümü çal</em> butonuyla sadece seçili
              kısmı dinle. Hazır olunca <em>Kırp ve İndir</em> ile WAV olarak
              al, ya da <em>AI ile Uzat</em> ile seçili bölümden devam eden yeni
              şarkı üret.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EffectCard({
  icon,
  title,
  value,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white text-[12px] font-semibold">
          {icon}
          {title}
        </div>
        <span className="text-[#888] text-[11px] tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}

function fmt(s: number): string {
  if (!s || !Number.isFinite(s)) return "0:00";
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

/**
 * AudioBuffer → WAV blob dönüştürücü (kayıpsız, 16-bit PCM)
 */
function bufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sr * blockAlign;
  const dataSize = frames * blockAlign;
  const totalSize = 44 + dataSize;
  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave & convert to 16-bit PCM
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numCh; i++) channelData.push(buffer.getChannelData(i));

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let s = Math.max(-1, Math.min(1, channelData[ch][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * 6-band parametric EQ:
 * - Band 0: Low-shelf @ 80Hz   (sub-bass)
 * - Band 1: Peaking @ 200Hz    (bass)
 * - Band 2: Peaking @ 800Hz    (low-mid)
 * - Band 3: Peaking @ 2.5kHz   (mid/presence)
 * - Band 4: Peaking @ 6kHz     (high-mid)
 * - Band 5: High-shelf @ 12kHz (treble)
 */
const EQ_BANDS: Array<{
  label: string;
  freq: number;
  type: BiquadFilterType;
  q: number;
}> = [
  { label: "80 Hz", freq: 80, type: "lowshelf", q: 1 },
  { label: "200 Hz", freq: 200, type: "peaking", q: 1 },
  { label: "800 Hz", freq: 800, type: "peaking", q: 1 },
  { label: "2.5 kHz", freq: 2500, type: "peaking", q: 1 },
  { label: "6 kHz", freq: 6000, type: "peaking", q: 1 },
  { label: "12 kHz", freq: 12000, type: "highshelf", q: 1 },
];

function buildEqChain(
  ctx: BaseAudioContext,
  gains: number[],
): BiquadFilterNode[] {
  return EQ_BANDS.map((band, idx) => {
    const node = ctx.createBiquadFilter();
    node.type = band.type;
    node.frequency.value = band.freq;
    node.Q.value = band.q;
    node.gain.value = gains[idx] ?? 0;
    return node;
  });
}
