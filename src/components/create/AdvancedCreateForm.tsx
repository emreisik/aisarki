"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Wand2,
  Maximize2,
  RotateCw,
  Loader2,
  Music2,
  Lock,
  Mic,
  MicOff,
  Upload,
  Check,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCredits } from "@/contexts/CreditsContext";
import { useToast } from "@/contexts/ToastContext";
import { localizeApiError } from "@/lib/sunoErrors";
import { useUpload } from "@/contexts/UploadContext";
import LyricsWizardModal from "./LyricsWizardModal";
import { ARTIST_PRESETS, GENRES, REGIONS, MAKAMS } from "@/lib/turkishMusicKB";

const STYLE_SUGGESTIONS = [
  "pulsing rhythms",
  "raï",
  "sarcastic",
  "slow metal",
  "gospel music",
  "dark trap",
  "synthwave",
  "dreamy indie",
  "arabesk",
  "türk pop",
  "anatolian rock",
  "lo-fi chill",
];

function sampleStyles(n = 5): string[] {
  const day = Math.floor(Date.now() / 86400000);
  return [...STYLE_SUGGESTIONS]
    .sort(
      (a, b) =>
        Math.sin((a.charCodeAt(0) + day) * 13) -
        Math.sin((b.charCodeAt(0) + day) * 13),
    )
    .slice(0, n);
}

type KbChipOption = { id: string; label: string; icon?: string };

function KbChipPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: KbChipOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange("")}
          className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
            value === ""
              ? "bg-white text-black"
              : "bg-[#1a1a1a] text-white hover:bg-[#222]"
          }`}
        >
          Yok
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(value === o.id ? "" : o.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] transition-colors flex items-center gap-1.5 ${
              value === o.id
                ? "bg-white text-black"
                : "bg-[#1a1a1a] text-white hover:bg-[#222]"
            }`}
          >
            {o.icon && <span>{o.icon}</span>}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type Props = {
  model: string;
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
  remixFromSourceId?: string;
};

export default function AdvancedCreateForm({
  model,
  onTaskStarted,
  remixFromSourceId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { credits, costs, refresh: refreshCredits } = useCredits();
  const toast = useToast();
  const { openRecord } = useUpload();
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!audioMenuRef.current?.contains(e.target as Node)) {
        setAudioMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [audioMenuOpen]);
  // Draft auto-save — sekme kapanırsa kaybolmasın
  const DRAFT_KEY = "aimusic:advancedForm:v1";
  type Draft = {
    lyrics?: string;
    style?: string;
    title?: string;
    instrumental?: boolean;
    isPublic?: boolean;
    vocalGender?: "" | "m" | "f";
    styleWeight?: number;
    weirdness?: number;
    artistId?: string;
    genreId?: string;
    regionId?: string;
    makamId?: string;
  };
  const loadDraft = (): Draft => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as Draft) : {};
    } catch {
      return {};
    }
  };
  const initialDraft = loadDraft();

  const [lyrics, setLyrics] = useState(initialDraft.lyrics ?? "");
  const [style, setStyle] = useState(initialDraft.style ?? "");
  const [title, setTitle] = useState(initialDraft.title ?? "");
  const [instrumental, setInstrumental] = useState(
    initialDraft.instrumental ?? false,
  );
  const [isPublic, setIsPublic] = useState<boolean>(
    initialDraft.isPublic ?? true,
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(true);
  const [stylesOpen, setStylesOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioChipName, setAudioChipName] = useState<string | null>(null);
  const [voiceChipName] = useState<string | null>(null);
  const [inspoChipName] = useState<string | null>(null);
  const [styleTags, setStyleTags] = useState<string[]>(sampleStyles(5));
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [lyricsWizardOpen, setLyricsWizardOpen] = useState(false);

  // Suno advanced parametreler
  const [vocalGender, setVocalGender] = useState<"" | "m" | "f">(
    initialDraft.vocalGender ?? "",
  );
  const [styleWeight, setStyleWeight] = useState<number>(
    initialDraft.styleWeight ?? 0.65,
  );
  const [weirdness, setWeirdness] = useState<number>(
    initialDraft.weirdness ?? 0.5,
  );
  const [artistId, setArtistId] = useState<string>(initialDraft.artistId ?? "");
  const [genreId, setGenreId] = useState<string>(initialDraft.genreId ?? "");
  const [regionId, setRegionId] = useState<string>(initialDraft.regionId ?? "");
  const [makamId, setMakamId] = useState<string>(initialDraft.makamId ?? "");
  const [personaId, setPersonaId] = useState<string>("");
  const [personas, setPersonas] = useState<
    Array<{ id: string; sunoPersonaId: string; name: string }>
  >([]);

  // ── Reuse: ?reuse=1&prompt=...&style=...&title=... → forma doldur (tek kerelik) ──
  const reuseConsumedRef = useRef(false);
  useEffect(() => {
    if (reuseConsumedRef.current) return;
    if (searchParams.get("reuse") !== "1") return;
    const reusePrompt = searchParams.get("prompt");
    const reuseStyle = searchParams.get("style");
    const reuseTitle = searchParams.get("title");
    if (reusePrompt) setLyrics(reusePrompt);
    if (reuseStyle) setStyle(reuseStyle);
    if (reuseTitle) setTitle(reuseTitle);
    reuseConsumedRef.current = true;
    // URL'yi temizle ki refresh'te tekrar uygulanmasın
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      ["reuse", "prompt", "style", "title"].forEach((k) =>
        url.searchParams.delete(k),
      );
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Draft'ı 500ms debounce ile localStorage'a kaydet
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(() => {
      try {
        const draft: Draft = {
          lyrics,
          style,
          title,
          instrumental,
          isPublic,
          vocalGender,
          styleWeight,
          weirdness,
          artistId,
          genreId,
          regionId,
          makamId,
        };
        const hasContent =
          lyrics.trim() ||
          style.trim() ||
          title.trim() ||
          artistId ||
          genreId ||
          regionId ||
          makamId;
        if (hasContent) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        /* quota aşıldı veya private mode — sessizce geç */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [
    lyrics,
    style,
    title,
    instrumental,
    isPublic,
    vocalGender,
    styleWeight,
    weirdness,
    artistId,
    genreId,
    regionId,
    makamId,
  ]);

  // Personaları bir kere çek
  useEffect(() => {
    let cancel = false;
    fetch("/api/personas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancel || !d?.personas) return;
        setPersonas(
          d.personas.map(
            (p: { id: string; sunoPersonaId: string; name: string }) => ({
              id: p.id,
              sunoPersonaId: p.sunoPersonaId,
              name: p.name,
            }),
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  const generateCost = costs.generate ?? 10;
  const hasEnoughCredits = (credits?.balance ?? 0) >= generateCost;
  const canCreate =
    style.trim().length > 0 &&
    (instrumental || lyrics.trim().length > 0) &&
    !loading &&
    hasEnoughCredits;

  const handleCreate = async () => {
    if (!hasEnoughCredits) {
      router.push("/pricing");
      return;
    }
    if (style.trim().length === 0) return;
    if (!instrumental && lyrics.trim().length === 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lyrics.trim(),
          style: style.trim(),
          title: title.trim() || undefined,
          instrumental,
          customMode: true,
          model,
          ...(vocalGender ? { vocalGender } : {}),
          styleWeight,
          weirdnessConstraint: weirdness,
          ...(artistId ? { artistId } : {}),
          ...(genreId ? { genreId } : {}),
          ...(regionId ? { regionId } : {}),
          ...(makamId ? { makamId } : {}),
          ...(personaId ? { personaId } : {}),
          isPublic,
          ...(remixFromSourceId ? { remixFromSourceId } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        const e = localizeApiError(data, "Kredi yetersiz");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        router.push("/pricing");
        return;
      }
      if (!res.ok) {
        const e = localizeApiError(data, "Hata oluştu");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      const taskId = data?.data?.taskId;
      if (!taskId) {
        const e = localizeApiError(data, "Görev başlatılamadı");
        setError(`${e.title}${e.message ? `: ${e.message}` : ""}`);
        toast.error(e.title, e.message);
        return;
      }
      onTaskStarted(taskId, style.trim(), (title || style).trim().slice(0, 40));
      setLyrics("");
      setStyle("");
      setTitle("");
      // Submit başarılı — draft'ı temizle (debounce useEffect boş içerik algılayıp kendi de siler)
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* noop */
      }
      refreshCredits();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const pickStyleTag = (t: string) => {
    setStyle((prev) => (prev.includes(t) ? prev : prev ? `${prev}, ${t}` : t));
  };

  return (
    <div>
      {/* Audio / Voice / Inspo row */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative" ref={audioMenuRef}>
          <button
            onClick={() => setAudioMenuOpen((v) => !v)}
            className="w-full h-12 rounded-full bg-[#141414] border border-[#1f1f1f] hover:bg-[#1a1a1a] flex items-center justify-center gap-2 text-[13px] font-medium text-white transition-colors"
          >
            <Plus size={14} />
            {audioChipName ? "Ses •" : "Ses"}
          </button>
          {audioMenuOpen && (
            <div className="absolute top-[56px] left-0 right-0 bg-[#1c1c1c] rounded-[14px] py-[6px] shadow-2xl shadow-black/60 z-50 border border-[#2a2a2a]">
              <button
                onClick={() => {
                  setAudioMenuOpen(false);
                  openRecord();
                }}
                className="flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#262626] transition-colors w-full text-left pressable"
              >
                <Mic size={15} className="text-[#ccc]" />
                <span className="text-white text-[13px] font-medium">
                  Mikrofon ile kaydet
                </span>
              </button>
              <button
                onClick={() => {
                  setAudioMenuOpen(false);
                  audioInputRef.current?.click();
                }}
                className="flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#262626] transition-colors w-full text-left pressable"
              >
                <Upload size={15} className="text-[#ccc]" />
                <span className="text-white text-[13px] font-medium">
                  Cihazdan yükle
                </span>
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setInstrumental((v) => !v)}
          className={`flex-1 h-12 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-colors border ${
            instrumental
              ? "bg-white text-black border-white hover:bg-[#eee]"
              : "bg-[#141414] text-white border-[#1f1f1f] hover:bg-[#1a1a1a]"
          }`}
          title={instrumental ? "Vokal eklemek için tıkla" : "Enstrümantal yap"}
        >
          {instrumental ? <MicOff size={14} /> : <Mic size={14} />}
          {instrumental ? "Enstrümantal" : "Vokal"}
        </button>
        <button
          onClick={() => setStyleTags(sampleStyles(5))}
          className="flex-1 h-12 rounded-full bg-[#141414] border border-[#1f1f1f] hover:bg-[#1a1a1a] flex items-center justify-center gap-2 text-[13px] font-medium text-white transition-colors"
          title="Yeni tarz önerileri"
        >
          <RotateCw size={14} />
          İlham
        </button>
      </div>

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setAudioChipName(f.name);
          e.target.value = "";
        }}
      />

      {/* Lyrics card */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <div className="w-full flex items-center justify-between px-5 py-4">
          <button
            onClick={() => setLyricsOpen((v) => !v)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <ChevronDown
              size={16}
              className={`text-white transition-transform ${lyricsOpen ? "" : "-rotate-90"}`}
            />
            <span className="text-white text-[15px] font-semibold">Sözler</span>
            {instrumental && (
              <span className="text-[11px] text-[#888] ml-2">
                (enstrümantal)
              </span>
            )}
          </button>
          <button
            onClick={() => setLyricsWizardOpen(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#295b53] to-[#19b35c] hover:opacity-90 flex items-center justify-center"
            title="AI ile söz yaz"
          >
            <Wand2 size={13} className="text-white" />
          </button>
        </div>
        {lyricsOpen && (
          <div className="px-5 pb-4">
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Sözleri buraya yaz veya enstrümantal için boş bırak"
              rows={5}
              className="w-full bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                className="w-7 h-7 flex items-center justify-center text-[#666] hover:text-white"
                title="Bölüm ekle"
              >
                {"|||\\"}
              </button>
              <button
                className="w-8 h-8 rounded-full bg-[#232323] hover:bg-[#2e2e2e] flex items-center justify-center"
                title="Büyüt"
              >
                <Maximize2 size={12} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Styles card */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <div className="w-full flex items-center justify-between px-5 py-4">
          <button
            onClick={() => setStylesOpen((v) => !v)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <ChevronDown
              size={16}
              className={`text-white transition-transform ${stylesOpen ? "" : "-rotate-90"}`}
            />
            <span className="text-white text-[15px] font-semibold">
              Tarzlar
            </span>
          </button>
          <button
            onClick={() => setStyleTags(sampleStyles(5))}
            className="w-8 h-8 rounded-full bg-[#3b82f6] hover:bg-[#4990f7] flex items-center justify-center"
            title="Yeni tarz önerileri"
          >
            <Wand2 size={13} className="text-white" />
          </button>
        </div>
        {stylesOpen && (
          <div className="px-5 pb-4">
            <textarea
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Örn: pulsing rhythms, raï, sarcastic, slow metal"
              rows={3}
              className="w-full bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none resize-none leading-[22px]"
            />
            <div className="flex items-center gap-2 mt-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
              <button
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-[#666] hover:text-white"
                title="Bölüm"
              >
                {"|||\\"}
              </button>
              <button
                onClick={() => setStyleTags(sampleStyles(5))}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-[#232323] hover:bg-[#2e2e2e] flex items-center justify-center"
                title="Yenile"
              >
                <RotateCw size={12} className="text-white" />
              </button>
              {styleTags.map((t) => (
                <button
                  key={t}
                  onClick={() => pickStyleTag(t)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#232323] hover:bg-[#2e2e2e] text-white text-[13px] transition-colors whitespace-nowrap"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* More Options */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-5 py-4"
        >
          <ChevronRight
            size={16}
            className={`text-white transition-transform ${moreOpen ? "rotate-90" : ""}`}
          />
          <span className="text-white text-[15px] font-semibold">
            Diğer Ayarlar
          </span>
          {(vocalGender ||
            artistId ||
            genreId ||
            regionId ||
            makamId ||
            personaId) && (
            <span className="ml-auto text-[11px] text-[#19b35c] font-medium">
              Aktif
            </span>
          )}
        </button>
        {moreOpen && (
          <div className="px-5 pb-5 space-y-5">
            {/* Vokal cinsiyet */}
            <div>
              <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide">
                Vokal Cinsiyeti
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { v: "", label: "Otomatik" },
                    { v: "f", label: "Kadın" },
                    { v: "m", label: "Erkek" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setVocalGender(opt.v)}
                    className={`flex-1 h-9 rounded-full text-[12px] font-medium transition-colors ${
                      vocalGender === opt.v
                        ? "bg-white text-black"
                        : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Weight */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white text-[12px] font-medium uppercase tracking-wide">
                  Stil Ağırlığı
                </label>
                <span className="text-[#888] text-[12px] font-mono">
                  {styleWeight.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={styleWeight}
                onChange={(e) => setStyleWeight(parseFloat(e.target.value))}
                className="w-full accent-[#19b35c]"
              />
              <p className="text-[11px] text-[#666] mt-1">
                Tarza ne kadar sıkı bağlı kalsın (yüksek = katı).
              </p>
            </div>

            {/* Weirdness */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white text-[12px] font-medium uppercase tracking-wide">
                  Tuhaflık
                </label>
                <span className="text-[#888] text-[12px] font-mono">
                  {weirdness.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weirdness}
                onChange={(e) => setWeirdness(parseFloat(e.target.value))}
                className="w-full accent-[#19b35c]"
              />
              <p className="text-[11px] text-[#666] mt-1">
                Deneysellik seviyesi (yüksek = daha sıra dışı).
              </p>
            </div>

            {/* Persona */}
            {personas.length > 0 && (
              <div>
                <label className="block text-white text-[12px] font-medium mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Users size={12} /> Persona (Vokal)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setPersonaId("")}
                    className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
                      personaId === ""
                        ? "bg-white text-black"
                        : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                    }`}
                  >
                    Yok
                  </button>
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setPersonaId(
                          personaId === p.sunoPersonaId ? "" : p.sunoPersonaId,
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-[12px] transition-colors flex items-center gap-1 ${
                        personaId === p.sunoPersonaId
                          ? "bg-white text-black"
                          : "bg-[#1a1a1a] text-white hover:bg-[#222]"
                      }`}
                    >
                      {personaId === p.sunoPersonaId && <Check size={10} />}
                      {p.name}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#666] mt-1">
                  Persona seçildiğinde V5+ model kullanılır.
                </p>
              </div>
            )}

            {/* Janr */}
            <KbChipPicker
              label="Janr"
              value={genreId}
              options={Object.values(GENRES).map((g) => ({
                id: g.id,
                label: g.label,
              }))}
              onChange={setGenreId}
            />

            {/* Artist preset */}
            <KbChipPicker
              label="Stil Preseti"
              value={artistId}
              options={Object.values(ARTIST_PRESETS).map((a) => ({
                id: a.id,
                label: a.label,
                icon: a.icon,
              }))}
              onChange={setArtistId}
            />

            {/* Bölge */}
            <KbChipPicker
              label="Bölge"
              value={regionId}
              options={Object.values(REGIONS).map((r) => ({
                id: r.id,
                label: r.label,
              }))}
              onChange={setRegionId}
            />

            {/* Makam */}
            <KbChipPicker
              label="Makam"
              value={makamId}
              options={Object.values(MAKAMS).map((m) => ({
                id: m.id,
                label: m.label,
              }))}
              onChange={setMakamId}
            />
          </div>
        )}
      </div>

      {/* Song Title */}
      <div className="bg-[#141414] rounded-[20px] border border-[#1f1f1f] overflow-hidden mb-3">
        <div className="flex items-center gap-2 px-5 py-3">
          <Music2 size={14} className="text-[#666]" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Şarkı Başlığı (Opsiyonel)"
            className="flex-1 bg-transparent text-white text-[14px] placeholder-[#555] focus:outline-none"
          />
        </div>
      </div>

      {/* Visibility */}
      <button
        onClick={() => setIsPublic((v) => !v)}
        className="w-full bg-[#141414] rounded-[20px] border border-[#1f1f1f] hover:bg-[#181818] transition-colors overflow-hidden mb-3 flex items-center justify-between px-5 py-3 text-left"
        title={
          isPublic
            ? "Bu şarkı herkese açık feed'de görünür"
            : "Bu şarkı yalnızca sana özel, feed'de görünmez"
        }
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isPublic ? "bg-[#19b35c]/15" : "bg-[#1f1f1f]"
            }`}
          >
            {isPublic ? (
              <Users size={13} className="text-[#19b35c]" />
            ) : (
              <Lock size={13} className="text-[#888]" />
            )}
          </div>
          <div>
            <p className="text-white text-[13px] font-medium">
              {isPublic ? "Herkese açık" : "Yalnızca ben"}
            </p>
            <p className="text-[#666] text-[11px]">
              {isPublic
                ? "Keşfet ve profilinde görünür"
                : "Yalnızca senin görebileceğin özel şarkı"}
            </p>
          </div>
        </div>
        <div
          className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
            isPublic ? "bg-[#19b35c]" : "bg-[#2a2a2a]"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              isPublic ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </button>

      {error && <p className="text-red-400 text-[13px] mt-3 px-1">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={loading || (!canCreate && hasEnoughCredits)}
        className={`mt-4 w-full h-12 rounded-full flex items-center justify-center gap-2 text-[14px] font-semibold transition-all ${
          !hasEnoughCredits
            ? "bg-[#2a2a2a] text-white hover:bg-[#333]"
            : canCreate
              ? "text-white hover:opacity-90"
              : "bg-[#1f1f1f] text-[#666] cursor-not-allowed"
        }`}
        style={
          canCreate && hasEnoughCredits
            ? {
                background:
                  "linear-gradient(45deg, #082122 0%, #295b53 40%, #19b35c 75%, #fcff9a 100%)",
              }
            : undefined
        }
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : !hasEnoughCredits ? (
          <>
            <Lock size={14} />
            Krediyi Yükselt ({generateCost} kredi gerekli)
          </>
        ) : (
          <>
            <Music2 size={15} />
            Oluştur · {generateCost} kredi
          </>
        )}
      </button>

      {/* Unused chip state silencer */}
      <span className="hidden">
        {voiceChipName}
        {inspoChipName}
      </span>

      <LyricsWizardModal
        open={lyricsWizardOpen}
        onClose={() => setLyricsWizardOpen(false)}
        onApply={(l) => {
          setLyrics(l);
          setLyricsOpen(true);
          if (instrumental) setInstrumental(false);
        }}
        artistId={artistId}
        genreId={genreId}
        regionId={regionId}
        makamId={makamId}
      />
    </div>
  );
}
