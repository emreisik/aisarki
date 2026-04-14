"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Music2,
  Mic2,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { GenerateRequest, SunoApiResponse } from "@/types";

interface MusicGeneratorProps {
  onTaskStarted: (taskId: string, prompt: string, title: string) => void;
}

/* ── Veri ── */

const INSTRUMENT_CATEGORIES = {
  "Türk Geleneksel": [
    {
      id: "saz-uzun",
      label: "Bağlama",
      sub: "Uzun Sap",
      tag: "saz long-neck lute",
    },
    { id: "cura", label: "Cura", sub: "Kısa Saz", tag: "cura small saz" },
    {
      id: "divan-saz",
      label: "Divan Sazı",
      sub: "Büyük Saz",
      tag: "divan saz",
    },
    { id: "ud", label: "Ud", sub: "Arap/Türk", tag: "oud" },
    { id: "kanun", label: "Kanun", sub: "Telli", tag: "qanun kanun" },
    { id: "ney", label: "Ney", sub: "Nefesli", tag: "ney flute" },
    {
      id: "kaval",
      label: "Kaval",
      sub: "Halk Nefesli",
      tag: "kaval folk flute",
    },
    {
      id: "kemence-karadeniz",
      label: "Kemençe",
      sub: "Karadeniz",
      tag: "kemence fiddle Black Sea",
    },
    { id: "zurna", label: "Zurna", sub: "Çalgı", tag: "zurna shawm" },
    { id: "darbuka", label: "Darbuka", sub: "Vurmalı", tag: "darbuka tabla" },
    {
      id: "davul",
      label: "Davul",
      sub: "Büyük Vurmalı",
      tag: "davul bass drum",
    },
    {
      id: "def",
      label: "Def / Bendir",
      sub: "Çerçeve Davul",
      tag: "def bendir frame drum",
    },
    {
      id: "tulum",
      label: "Tulum",
      sub: "Karadeniz Gayda",
      tag: "tulum bagpipe",
    },
    { id: "mey", label: "Mey", sub: "Nefesli", tag: "mey duduk-like reed" },
  ],
  Batı: [
    {
      id: "acoustic-guitar",
      label: "Akustik Gitar",
      sub: "Steel String",
      tag: "acoustic guitar",
    },
    {
      id: "classical-guitar",
      label: "Klasik Gitar",
      sub: "Nylon / Fingerstyle",
      tag: "classical guitar fingerstyle",
    },
    {
      id: "electric-guitar-clean",
      label: "Elektrik Gitar",
      sub: "Clean Tone",
      tag: "clean electric guitar",
    },
    {
      id: "electric-guitar-dist",
      label: "Elektrik Gitar",
      sub: "Distorted",
      tag: "distorted electric guitar",
    },
    {
      id: "bass-guitar",
      label: "Bas Gitar",
      sub: "Elektrik",
      tag: "bass guitar",
    },
    {
      id: "upright-bass",
      label: "Kontrbas",
      sub: "Akustik",
      tag: "upright double bass",
    },
    { id: "piano", label: "Piyano", sub: "Akustik", tag: "piano" },
    {
      id: "grand-piano",
      label: "Kuyruklu Piyano",
      sub: "Konser",
      tag: "grand piano concert",
    },
    { id: "organ", label: "Org", sub: "Hammond / Kilise", tag: "organ" },
    { id: "violin", label: "Keman", sub: "Klasik", tag: "violin strings" },
    { id: "cello", label: "Çello", sub: "Yaylı", tag: "cello" },
    { id: "trumpet", label: "Trompet", sub: "Brass", tag: "trumpet brass" },
    {
      id: "saxophone",
      label: "Saksofon",
      sub: "Alto / Tenor",
      tag: "saxophone",
    },
    { id: "clarinet", label: "Klarnet", sub: "Ağızlıklı", tag: "clarinet" },
    {
      id: "drums",
      label: "Bateri",
      sub: "Akustik Kit",
      tag: "acoustic drum kit",
    },
  ],
  Elektronik: [
    {
      id: "synth-lead",
      label: "Synth Lead",
      sub: "Melodik",
      tag: "analog synth lead",
    },
    {
      id: "synth-pad",
      label: "Synth Pad",
      sub: "Atmosferik",
      tag: "atmospheric synth pad",
    },
    {
      id: "synth-arp",
      label: "Arp Synth",
      sub: "Ritimli Dizi",
      tag: "arpeggiated synthesizer",
    },
    {
      id: "808-bass",
      label: "808 Bass",
      sub: "Hip-Hop / Trap",
      tag: "808 bass",
    },
    {
      id: "drum-machine",
      label: "Drum Machine",
      sub: "Programlanmış",
      tag: "drum machine electronic beats",
    },
    {
      id: "rhodes",
      label: "Rhodes",
      sub: "Elektrik Piyano",
      tag: "rhodes electric piano",
    },
    {
      id: "wurlitzer",
      label: "Wurlitzer",
      sub: "Vintage Elektrik",
      tag: "wurlitzer vintage electric piano",
    },
    {
      id: "vocoder",
      label: "Vocoder",
      sub: "Robot Ses",
      tag: "vocoder robotic voice",
    },
  ],
} as const;

type InstrumentCategory = keyof typeof INSTRUMENT_CATEGORIES;

const TEMPOS = [
  {
    id: "very-slow",
    label: "Çok Yavaş",
    bpm: "~55 BPM",
    tag: "very slow tempo, 55 bpm, ballad",
  },
  { id: "slow", label: "Yavaş", bpm: "~75 BPM", tag: "slow tempo, 75 bpm" },
  { id: "medium", label: "Orta", bpm: "~95 BPM", tag: "mid-tempo, 95 bpm" },
  {
    id: "upbeat",
    label: "Hızlı",
    bpm: "~120 BPM",
    tag: "upbeat tempo, 120 bpm",
  },
  {
    id: "fast",
    label: "Çok Hızlı",
    bpm: "~150 BPM",
    tag: "fast tempo, 150 bpm, energetic",
  },
];

const PRODUCTIONS = [
  {
    id: "lo-fi",
    label: "Lo-Fi",
    desc: "Sıcak, vinil",
    tag: "lo-fi, warm vinyl, tape hiss",
  },
  {
    id: "live",
    label: "Canlı",
    desc: "Ham, organik",
    tag: "live recording, organic, raw, room reverb",
  },
  {
    id: "studio",
    label: "Stüdyo",
    desc: "Parlak, temiz",
    tag: "studio quality, polished, clean mix",
  },
  {
    id: "cinematic",
    label: "Sinematik",
    desc: "Epik, geniş",
    tag: "cinematic, epic, wide orchestration",
  },
  {
    id: "bedroom",
    label: "Bedroom Pop",
    desc: "Samimi, DIY",
    tag: "bedroom pop, intimate, DIY production",
  },
];

const MOODS = [
  { id: "melancholic", label: "Hüzünlü", tag: "melancholic, bittersweet, sad" },
  { id: "nostalgic", label: "Nostaljik", tag: "nostalgic, longing, wistful" },
  { id: "romantic", label: "Romantik", tag: "romantic, tender, loving" },
  { id: "joyful", label: "Neşeli", tag: "joyful, uplifting, cheerful" },
  {
    id: "mystical",
    label: "Mistik",
    tag: "mystical, ethereal, dark, spiritual",
  },
  { id: "angry", label: "Öfkeli", tag: "angry, intense, powerful, aggressive" },
  {
    id: "peaceful",
    label: "Huzurlu",
    tag: "peaceful, serene, calm, meditative",
  },
  { id: "epic", label: "Epik", tag: "epic, grand, heroic, triumphant" },
  { id: "dark", label: "Karanlık", tag: "dark, brooding, ominous, heavy" },
  {
    id: "playful",
    label: "Eğlenceli",
    tag: "playful, fun, lighthearted, quirky",
  },
];

const VOCALS = [
  {
    id: "female-turkish",
    label: "Kadın",
    sub: "Türk tını",
    tag: "female Turkish vocal, authentic",
  },
  {
    id: "male-turkish",
    label: "Erkek",
    sub: "Türk tını",
    tag: "male Turkish vocal, authentic",
  },
  {
    id: "choir",
    label: "Koro",
    sub: "Çok sesli",
    tag: "vocal choir, harmonies, group vocals",
  },
  {
    id: "rap",
    label: "Rap",
    sub: "Hip-hop akışı",
    tag: "rap vocals, hip-hop flow, rhythmic",
  },
  {
    id: "spoken",
    label: "Spoken Word",
    sub: "Şiirsel",
    tag: "spoken word, poetic narration",
  },
  {
    id: "falsetto",
    label: "Falsetto",
    sub: "Tiz, kırılgan",
    tag: "falsetto vocals, breathy, fragile",
  },
  { id: "none", label: "Enstrümantal", sub: "Vokal yok", tag: "" },
];

const REGIONS = [
  {
    id: "karadeniz",
    label: "Karadeniz",
    sub: "Kemençe, horon",
    tag: "Black Sea Turkish folk, kemence fiddle, horon rhythm, pentatonic scale, Karadeniz",
  },
  {
    id: "ege",
    label: "Ege",
    sub: "Zeybek, bağlama",
    tag: "Aegean Turkish folk, zeybek rhythm, slow heavy beat, Ege region",
  },
  {
    id: "orta-anadolu",
    label: "Orta Anadolu",
    sub: "Türkü, halay",
    tag: "Central Anatolian folk, saz-driven, türkü style, halay rhythm",
  },
  {
    id: "dogu-anadolu",
    label: "Doğu Anadolu",
    sub: "Dengbej, ağıt",
    tag: "Eastern Anatolian folk, dengbej lament, mournful, sparse arrangement, mountainous",
  },
  {
    id: "guneydogu",
    label: "Güneydoğu",
    sub: "Davul zurna, halay",
    tag: "Southeastern Turkish folk, davul zurna, festive halay, energetic",
  },
  {
    id: "trakya",
    label: "Trakya",
    sub: "Klarnet, karşılama",
    tag: "Thracian Turkish folk, clarinet-led, karşılama rhythm, Balkan influence",
  },
  {
    id: "istanbul",
    label: "İstanbul / Sanat",
    sub: "Fasıl, makam",
    tag: "Istanbul Turkish art music, fasıl, maqam-based, Ottoman classical influence",
  },
  {
    id: "rumeli",
    label: "Rumeli",
    sub: "Balkan, çiftetelli",
    tag: "Rumelian Turkish folk, Balkan brass, lively, çiftetelli",
  },
];

const ERAS = [
  {
    id: "ottoman",
    label: "Osmanlı",
    sub: "–1920",
    tag: "Ottoman classical music, makam, ud and ney, ancient Turkish court music, historical",
  },
  {
    id: "cumhuriyet",
    label: "Cumhuriyet",
    sub: "1920–50",
    tag: "early Turkish Republic era, 1930s Turkish folk revival, TRT style, acoustic recording",
  },
  {
    id: "60s",
    label: "60'lar",
    sub: "Anadolu Rock",
    tag: "1960s Anatolian rock, Turkish psychedelic, electric saz, vintage recording",
  },
  {
    id: "70s-arabesk",
    label: "70'ler",
    sub: "Arabesk altın çağ",
    tag: "1970s Turkish arabesk golden age, orchestral strings, melancholic, Orhan Gencebay style",
  },
  {
    id: "80s",
    label: "80'ler",
    sub: "Pop arabesk",
    tag: "1980s Turkish pop arabesk, synthesizer, drum machine, Müslüm Gürses style",
  },
  {
    id: "90s",
    label: "90'lar",
    sub: "Türk pop",
    tag: "1990s Turkish pop, glossy production, Sezen Aksu style, upbeat",
  },
  {
    id: "2000s",
    label: "2000'ler",
    sub: "R&B fusion",
    tag: "2000s Turkish pop R&B fusion, modern production, auto-tune era",
  },
  {
    id: "modern",
    label: "Güncel",
    sub: "2020+",
    tag: "contemporary Turkish music, modern production, streaming era",
  },
];

const MAKAMS = [
  {
    id: "hicaz",
    label: "Hicaz",
    sub: "Dramatik, Orta Doğu",
    tag: "Hicaz maqam, augmented second, dramatic, Middle Eastern scale",
  },
  {
    id: "rast",
    label: "Rast",
    sub: "Neşeli, doğal",
    tag: "Rast maqam, natural joyful Turkish scale",
  },
  {
    id: "ussak",
    label: "Uşşak",
    sub: "Hüzünlü, içli",
    tag: "Uşşak maqam, melancholic Turkish scale, inner sorrow",
  },
  {
    id: "kürdi",
    label: "Kürdi",
    sub: "Derin, hüzün",
    tag: "Kürdi maqam, deep melancholy, minor Turkish scale",
  },
  {
    id: "nihavend",
    label: "Nihavend",
    sub: "Batılı minor",
    tag: "Nihavend maqam, Western-influenced minor, harmonic",
  },
  {
    id: "huseyni",
    label: "Hüseyni",
    sub: "Asil, dengeli",
    tag: "Hüseyni maqam, noble balanced Turkish scale",
  },
  {
    id: "segah",
    label: "Segâh",
    sub: "Mistik, dini",
    tag: "Segâh maqam, mystical spiritual Turkish scale",
  },
  {
    id: "saba",
    label: "Saba",
    sub: "Ağıt, gözyaşı",
    tag: "Saba maqam, tearful lament Turkish scale, ağıt",
  },
  {
    id: "buselik",
    label: "Büselik",
    sub: "Sert, güçlü",
    tag: "Büselik maqam, strong forceful Turkish scale",
  },
  {
    id: "acemli",
    label: "Acemli",
    sub: "Hafif, Batılı",
    tag: "Acemli maqam, light Western-adjacent Turkish scale",
  },
];

/* ── Yardımcı: stil string'i oluştur ── */
function buildStyleString(config: {
  instruments: string[];
  tempo: string;
  production: string;
  moods: string[];
  vocal: string;
  region: string;
  era: string;
  makam: string;
}): string {
  const parts: string[] = [];

  const instTags = config.instruments
    .flatMap((id) =>
      Object.values(INSTRUMENT_CATEGORIES)
        .flat()
        .filter((i) => i.id === id)
        .map((i) => i.tag),
    )
    .filter(Boolean);
  parts.push(...instTags);

  const tempoTag = TEMPOS.find((t) => t.id === config.tempo)?.tag;
  if (tempoTag) parts.push(tempoTag);

  const prodTag = PRODUCTIONS.find((p) => p.id === config.production)?.tag;
  if (prodTag) parts.push(prodTag);

  const moodTags = config.moods
    .map((id) => MOODS.find((m) => m.id === id)?.tag)
    .filter(Boolean) as string[];
  parts.push(...moodTags);

  const vocalTag = VOCALS.find((v) => v.id === config.vocal)?.tag;
  if (vocalTag) parts.push(vocalTag);

  const regionTag = REGIONS.find((r) => r.id === config.region)?.tag;
  if (regionTag) parts.push(regionTag);

  const eraTag = ERAS.find((e) => e.id === config.era)?.tag;
  if (eraTag) parts.push(eraTag);

  const makamTag = MAKAMS.find((m) => m.id === config.makam)?.tag;
  if (makamTag) parts.push(makamTag);

  return parts.join(", ");
}

/* ── Alt bileşenler ── */

function SectionHeader({
  title,
  open,
  onToggle,
  summary,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-left pressable"
    >
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-semibold">{title}</span>
        {summary && !open && (
          <span className="text-[#1db954] text-xs truncate max-w-[160px]">
            {summary}
          </span>
        )}
      </div>
      {open ? (
        <ChevronUp size={16} className="text-[#535353] flex-shrink-0" />
      ) : (
        <ChevronDown size={16} className="text-[#535353] flex-shrink-0" />
      )}
    </button>
  );
}

function Chip({
  label,
  sub,
  selected,
  onClick,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all pressable flex-shrink-0 border ${
        selected
          ? "bg-[#1db954]/15 border-[#1db954] text-white"
          : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a7a7a7] hover:border-[#535353] hover:text-white"
      }`}
    >
      <span className="text-xs font-semibold leading-tight">{label}</span>
      {sub && (
        <span
          className={`text-[10px] leading-tight ${selected ? "text-[#1db954]/80" : "text-[#535353]"}`}
        >
          {sub}
        </span>
      )}
    </button>
  );
}

function OptionRow<T extends { id: string; label: string; tag: string }>({
  options,
  selected,
  onSelect,
  extra,
}: {
  options: readonly T[];
  selected: string;
  onSelect: (id: string) => void;
  extra?: (item: T) => React.ReactNode;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          className={`flex flex-col items-start px-3 py-2 rounded-xl text-left transition-all pressable border ${
            selected === o.id
              ? "bg-[#1db954]/15 border-[#1db954] text-white"
              : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a7a7a7] hover:border-[#535353] hover:text-white"
          }`}
        >
          <span className="text-xs font-semibold">{o.label}</span>
          {extra && (
            <span
              className={`text-[10px] ${selected === o.id ? "text-[#1db954]/80" : "text-[#535353]"}`}
            >
              {extra(o)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Ana component ── */

export default function MusicGenerator({ onTaskStarted }: MusicGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Style state
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [instCategory, setInstCategory] =
    useState<InstrumentCategory>("Türk Geleneksel");
  const [tempo, setTempo] = useState("");
  const [production, setProduction] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [vocal, setVocal] = useState("");
  const [region, setRegion] = useState("");
  const [era, setEra] = useState("");
  const [makam, setMakam] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Lyrics state
  const [lyrics, setLyrics] = useState("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState("");

  // Section open state
  const [openSection, setOpenSection] = useState<string | null>("instruments");

  const toggleSection = (s: string) =>
    setOpenSection((prev) => (prev === s ? null : s));

  const toggleInstrument = (id: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length >= 5
          ? prev
          : [...prev, id],
    );
  };

  const toggleMood = (id: string) => {
    setMoods((prev) =>
      prev.includes(id)
        ? prev.filter((m) => m !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id],
    );
  };

  // Mevcut seçili enstrümanların etiketlerini bul
  const allInstruments = Object.values(INSTRUMENT_CATEGORIES).flat();
  const selectedInstLabels = selectedInstruments
    .map((id) => allInstruments.find((i) => i.id === id)?.label)
    .filter(Boolean)
    .join(", ");

  const autoStyle = buildStyleString({
    instruments: selectedInstruments,
    tempo,
    production,
    moods,
    vocal,
    region,
    era,
    makam,
  });

  const styleString = [autoStyle, customNotes.trim()]
    .filter(Boolean)
    .join(", ");

  const hasStyle =
    selectedInstruments.length > 0 ||
    tempo ||
    production ||
    moods.length > 0 ||
    vocal ||
    region ||
    era ||
    makam ||
    customNotes.trim().length > 0;

  const handleGenerateLyrics = async () => {
    if (!prompt.trim()) {
      setLyricsError("Önce bir konu yaz");
      return;
    }
    setLyricsError("");
    setLyricsLoading(true);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: prompt.trim(),
          region: REGIONS.find((r) => r.id === region)?.label,
          era: ERAS.find((e) => e.id === era)?.label,
          makam: MAKAMS.find((m) => m.id === makam)?.label,
          mood: moods
            .map((id) => MOODS.find((m) => m.id === id)?.label)
            .filter(Boolean)
            .join(", "),
          vocal: VOCALS.find((v) => v.id === vocal)?.label,
          customNotes: customNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLyricsError(data.error || "Sözler oluşturulamadı");
        return;
      }
      setLyrics(data.lyrics);
    } catch {
      setLyricsError("Bağlantı hatası");
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleGenerate = async () => {
    // Lyrics varsa onu kullan (customMode), yoksa normal prompt
    const finalPrompt = lyrics.trim() || prompt.trim();
    const isLyrics = !!lyrics.trim();

    if (!finalPrompt) {
      setError("Bir konu veya söz gir");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const isInstrumental = vocal === "none";
      const payload: GenerateRequest = {
        prompt: finalPrompt,
        style: styleString || undefined,
        title: title.trim() || undefined,
        instrumental: isInstrumental,
        customMode: isLyrics ? true : customMode,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: SunoApiResponse = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error || "Hata oluştu");
        return;
      }

      const taskId = data.data?.taskId;
      if (!taskId) {
        setError(
          (data as { error?: string }).error ||
            data.msg ||
            "Görev başlatılamadı",
        );
        return;
      }

      onTaskStarted(
        taskId,
        prompt.trim(),
        title.trim() || prompt.trim().slice(0, 40),
      );
      setPrompt("");
      setTitle("");
      setLyrics("");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-0 bg-[#161616] rounded-2xl overflow-hidden border border-[#2a2a2a]">
      {/* Mode tabs */}
      <div className="flex bg-[#1a1a1a] p-1 gap-1 border-b border-[#2a2a2a]">
        <button
          onClick={() => setCustomMode(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            !customMode ? "bg-[#2a2a2a] text-white" : "text-[#a7a7a7]"
          }`}
        >
          <Sparkles size={14} />
          Fikir
        </button>
        <button
          onClick={() => setCustomMode(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            customMode ? "bg-[#2a2a2a] text-white" : "text-[#a7a7a7]"
          }`}
        >
          <Music2 size={14} />
          Sözlü
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Prompt */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              customMode
                ? "[Nakarat]\nŞarkı sözlerini buraya yaz..."
                : "Sahilde özgür hissettiren bir şarkı, rüzgarın sesi..."
            }
            rows={customMode ? 7 : 3}
            maxLength={customMode ? 5000 : 500}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-white text-sm placeholder-[#3a3a3a] resize-none focus:outline-none focus:border-[#535353] transition-colors"
          />
          <span className="absolute bottom-3 right-3 text-[#535353] text-xs tabular-nums">
            {prompt.length}/{customMode ? 5000 : 500}
          </span>
        </div>

        {/* AI Lyrics butonu — simple modda göster */}
        {!customMode && vocal !== "none" && (
          <button
            onClick={handleGenerateLyrics}
            disabled={lyricsLoading || !prompt.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all pressable border border-[#2a2a2a] disabled:opacity-40"
            style={{
              background: lyricsLoading ? "#0d0d0d" : "#0d1f14",
              color: lyricsLoading ? "#535353" : "#1db954",
              borderColor: lyricsLoading ? "#2a2a2a" : "#1db954/30",
            }}
          >
            {lyricsLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Sözler yazılıyor...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                AI ile Söz Yaz
              </>
            )}
          </button>
        )}

        {/* Lyrics error */}
        {lyricsError && (
          <p className="text-red-400 text-xs text-center">{lyricsError}</p>
        )}

        {/* Generated lyrics preview + edit */}
        {lyrics && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[#1db954] text-xs font-semibold uppercase tracking-widest">
                Oluşturulan Sözler
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateLyrics}
                  disabled={lyricsLoading}
                  className="text-[#535353] hover:text-[#a7a7a7] text-xs transition-colors pressable disabled:opacity-40"
                >
                  Yeniden yaz
                </button>
                <button
                  onClick={() => setLyrics("")}
                  className="text-[#535353] hover:text-red-400 text-xs transition-colors pressable"
                >
                  Sil
                </button>
              </div>
            </div>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={10}
              className="w-full bg-[#0d1f14] border border-[#1db954]/20 rounded-xl px-4 py-3.5 text-white text-xs placeholder-[#3a3a3a] resize-none focus:outline-none focus:border-[#1db954]/40 transition-colors leading-relaxed font-mono"
            />
            <p className="text-[#535353] text-[10px] text-center">
              Düzenleyebilirsiniz — şarkı bu sözlerle oluşturulur
            </p>
          </div>
        )}

        {/* Custom mode: title */}
        {(customMode || lyrics) && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Şarkı adı (isteğe bağlı)"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a3a3a] focus:outline-none focus:border-[#535353] transition-colors"
          />
        )}

        {/* Divider */}
        <div className="border-t border-[#2a2a2a] -mx-4" />

        {/* ── ENSTRÜMANLAR ── */}
        <div>
          <SectionHeader
            title="Enstrümanlar"
            open={openSection === "instruments"}
            onToggle={() => toggleSection("instruments")}
            summary={selectedInstLabels || undefined}
          />
          {openSection === "instruments" && (
            <div className="mt-2 flex flex-col gap-3">
              {/* Seçilenler */}
              {selectedInstruments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedInstruments.map((id) => {
                    const inst = allInstruments.find((i) => i.id === id);
                    if (!inst) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => toggleInstrument(id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954] text-xs font-semibold pressable"
                      >
                        {inst.label}
                        <X size={11} />
                      </button>
                    );
                  })}
                  {selectedInstruments.length >= 5 && (
                    <span className="text-[#535353] text-xs self-center">
                      maks 5
                    </span>
                  )}
                </div>
              )}

              {/* Kategori tab */}
              <div className="flex gap-1 bg-[#0d0d0d] rounded-lg p-1">
                {(
                  Object.keys(INSTRUMENT_CATEGORIES) as InstrumentCategory[]
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInstCategory(cat)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors pressable ${
                      instCategory === cat
                        ? "bg-[#2a2a2a] text-white"
                        : "text-[#535353] hover:text-[#a7a7a7]"
                    }`}
                  >
                    {cat === "Türk Geleneksel" ? "Türk" : cat}
                  </button>
                ))}
              </div>

              {/* Enstrüman listesi */}
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto scroll-area pr-1">
                {INSTRUMENT_CATEGORIES[instCategory].map((inst) => (
                  <Chip
                    key={inst.id}
                    label={inst.label}
                    sub={inst.sub}
                    selected={selectedInstruments.includes(inst.id)}
                    onClick={() => toggleInstrument(inst.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── TEMPO ── */}
        <div>
          <SectionHeader
            title="Tempo"
            open={openSection === "tempo"}
            onToggle={() => toggleSection("tempo")}
            summary={TEMPOS.find((t) => t.id === tempo)?.label}
          />
          {openSection === "tempo" && (
            <div className="mt-2">
              <OptionRow
                options={TEMPOS}
                selected={tempo}
                onSelect={(id) => setTempo((prev) => (prev === id ? "" : id))}
                extra={(t) => (t as (typeof TEMPOS)[0]).bpm}
              />
            </div>
          )}
        </div>

        {/* ── PRODÜKSİYON ── */}
        <div>
          <SectionHeader
            title="Prodüksiyon"
            open={openSection === "production"}
            onToggle={() => toggleSection("production")}
            summary={PRODUCTIONS.find((p) => p.id === production)?.label}
          />
          {openSection === "production" && (
            <div className="mt-2">
              <OptionRow
                options={PRODUCTIONS}
                selected={production}
                onSelect={(id) =>
                  setProduction((prev) => (prev === id ? "" : id))
                }
                extra={(p) => (p as (typeof PRODUCTIONS)[0]).desc}
              />
            </div>
          )}
        </div>

        {/* ── DUYGU ── */}
        <div>
          <SectionHeader
            title="Duygu"
            open={openSection === "mood"}
            onToggle={() => toggleSection("mood")}
            summary={
              moods.length > 0
                ? moods
                    .map((id) => MOODS.find((m) => m.id === id)?.label)
                    .join(", ")
                : undefined
            }
          />
          {openSection === "mood" && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMood(m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all pressable border ${
                      moods.includes(m.id)
                        ? "bg-[#1db954]/15 border-[#1db954] text-white"
                        : "bg-[#1a1a1a] border-[#2a2a2a] text-[#a7a7a7] hover:border-[#535353]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {moods.length >= 3 && (
                <p className="text-[#535353] text-xs mt-2">maks 3 duygu</p>
              )}
            </div>
          )}
        </div>

        {/* ── VOKAL ── */}
        <div>
          <SectionHeader
            title="Vokal"
            open={openSection === "vocal"}
            onToggle={() => toggleSection("vocal")}
            summary={VOCALS.find((v) => v.id === vocal)?.label}
          />
          {openSection === "vocal" && (
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-1.5">
                {VOCALS.map((v) => (
                  <Chip
                    key={v.id}
                    label={v.label}
                    sub={v.sub}
                    selected={vocal === v.id}
                    onClick={() =>
                      setVocal((prev) => (prev === v.id ? "" : v.id))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── YÖRE ── */}
        <div>
          <SectionHeader
            title="Yöre"
            open={openSection === "region"}
            onToggle={() => toggleSection("region")}
            summary={REGIONS.find((r) => r.id === region)?.label}
          />
          {openSection === "region" && (
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-1.5">
                {REGIONS.map((r) => (
                  <Chip
                    key={r.id}
                    label={r.label}
                    sub={r.sub}
                    selected={region === r.id}
                    onClick={() =>
                      setRegion((prev) => (prev === r.id ? "" : r.id))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── DÖNEM ── */}
        <div>
          <SectionHeader
            title="Dönem"
            open={openSection === "era"}
            onToggle={() => toggleSection("era")}
            summary={ERAS.find((e) => e.id === era)?.label}
          />
          {openSection === "era" && (
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-1.5">
                {ERAS.map((e) => (
                  <Chip
                    key={e.id}
                    label={e.label}
                    sub={e.sub}
                    selected={era === e.id}
                    onClick={() =>
                      setEra((prev) => (prev === e.id ? "" : e.id))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── MAKAM ── */}
        <div>
          <SectionHeader
            title="Makam"
            open={openSection === "makam"}
            onToggle={() => toggleSection("makam")}
            summary={MAKAMS.find((m) => m.id === makam)?.label}
          />
          {openSection === "makam" && (
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-1.5">
                {MAKAMS.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.label}
                    sub={m.sub}
                    selected={makam === m.id}
                    onClick={() =>
                      setMakam((prev) => (prev === m.id ? "" : m.id))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SERBEST NOTLAR ── */}
        <div>
          <SectionHeader
            title="Serbest Notlar"
            open={openSection === "custom"}
            onToggle={() => toggleSection("custom")}
            summary={customNotes.trim() || undefined}
          />
          {openSection === "custom" && (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder={
                  "bağlama ile açılış, sonra piyano devralır\nsadece akustik gitar, minimal\nnakarat öncesi davul girişi\nyavaş intro, nakarat'ta full band"
                }
                rows={3}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-3 text-white text-xs placeholder-[#3a3a3a] resize-none focus:outline-none focus:border-[#535353] transition-colors leading-relaxed"
              />
              {/* Hazır notlar */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "bağlama ile açılış",
                  "ney solo",
                  "davul girişi",
                  "sadece akustik",
                  "yavaş intro",
                  "full band nakarat",
                  "minimal aranje",
                  "canlı performans hissi",
                  "ud ile kapanış",
                ].map((note) => (
                  <button
                    key={note}
                    onClick={() =>
                      setCustomNotes((prev) =>
                        prev
                          ? prev.endsWith(",")
                            ? `${prev} ${note}`
                            : `${prev}, ${note}`
                          : note,
                      )
                    }
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#a7a7a7] hover:border-[#535353] hover:text-white transition-colors pressable"
                  >
                    + {note}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Style preview */}
        {hasStyle && (
          <div className="bg-[#0d0d0d] rounded-xl px-3 py-2.5 border border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[#535353] text-[10px] uppercase tracking-widest">
                Suno&apos;ya gidecek stil
              </p>
              {styleString && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(styleString);
                  }}
                  className="text-[#535353] hover:text-[#a7a7a7] text-[10px] transition-colors pressable"
                >
                  kopyala
                </button>
              )}
            </div>
            <p className="text-[#a7a7a7] text-xs leading-relaxed break-words">
              {styleString}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 rounded-full font-bold text-base tracking-wide transition-all pressable disabled:opacity-50"
          style={{
            background: loading ? "#1a1a1a" : "#1db954",
            color: loading ? "#a7a7a7" : "black",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Başlatılıyor...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Mic2 size={18} />
              Şarkı Oluştur
            </span>
          )}
        </button>

        <p className="text-center text-[#535353] text-xs -mt-1">
          Her seferinde 2 farklı versiyon · ~1–3 dk
        </p>
      </div>
    </div>
  );
}
