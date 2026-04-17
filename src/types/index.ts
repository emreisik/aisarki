export interface SongCreator {
  id: string;
  name: string;
  username: string;
  image?: string;
}

export interface Song {
  id: string;
  title: string;
  style?: string;
  prompt?: string;
  audioUrl?: string;
  streamUrl?: string;
  imageUrl?: string;
  duration?: number;
  status: "pending" | "processing" | "complete" | "error";
  /** Lifetime stream sayısı (30sn+ dinleme = 1 stream) */
  playCount?: number;
  /** Son 7 gün stream sayısı (trending sıralama sinyali) */
  playCount7d?: number;
  /** Toplam beğeni sayısı (song_likes tablosundan denormalize) */
  likeCount?: number;
  /** O anki kullanıcı bu şarkıyı beğendi mi? (opsiyonel, frontend için) */
  liked?: boolean;
  /** Toplam yorum sayısı (song_comments tablosundan denormalize) */
  commentCount?: number;
  createdAt: string;
  creator?: SongCreator;
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  type: "playlist" | "album";
  songCount?: number;
  songs?: Song[];
  owner?: { username: string; displayName: string };
  createdAt: string;
  updatedAt: string;
}

export interface SongComment {
  id: string;
  songId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: SongCreator;
}

export interface Persona {
  id: string;
  userId: string;
  sunoPersonaId: string;
  name: string;
  description?: string;
  sourceSong?: { id: string; title: string; imageUrl?: string };
  vocalStart: number;
  vocalEnd: number;
  personaType: "style_persona" | "voice_persona";
  createdAt: string;
}

export interface GenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  customMode?: boolean;
  /** Suno model override (V4, V4_5, V4_5PLUS, V4_5ALL, V5, V5_5) */
  model?: string;
  /** Sihirli mod: analyze sonucundan otomatik tüm Suno params'ı kur */
  artistId?: string; // ArtistPresetId — turkishMusicKB
  genreId?: string; // GenreId
  regionId?: string; // RegionId
  makamId?: string; // MakamId
  vocalGender?: "m" | "f";
  /** Manuel override (kullanıcı slider'la değiştirdiyse) */
  styleWeight?: number;
  weirdnessConstraint?: number;
  /** Suno persona ID (ses klonu veya stil persona) — sadece customMode'da */
  personaId?: string;
  /** Persona tipi: voice_persona (V5+ gerekir) veya style_persona */
  personaModel?: "style_persona" | "voice_persona";
}

export interface SunoGeneratePayload {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  prompt?: string;
  style?: string;
  title?: string;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  callBackUrl?: string;
}

/** Claude analiz çıktısı — Türk müzik bilgi tabanı ile birleştirildiğinde
 *  tüm Suno params + lyrics context'i otomatik kurulur. */
export interface PromptAnalysis {
  /** Kısa tema özeti (örn "anneye doğum günü şükranı") */
  theme: string;
  /** Duygu etiketleri (örn ["şükür", "sıcaklık", "nostalji"]) */
  emotion: string[];
  /** Dönem hissi: "modern" | "vintage" | "ottoman" | "mixed" */
  era: string;
  /** Birincil janr (turkishMusicKB GenreId) */
  genrePrimary: string;
  /** İkincil janr (opsiyonel) */
  genreSecondary?: string;
  /** Yöre (turkishMusicKB RegionId, opsiyonel) */
  region?: string;
  /** Anlatıcı perspektifi */
  characterPerspective: string;
  /** Önerilen vokal cinsiyeti */
  vocalGender: "m" | "f";
  /** Önerilen sanatçı persona (turkishMusicKB ArtistPresetId, opsiyonel) */
  suggestedArtist?: string;
  /** Tempo aralığı [min, max] */
  bpm: [number, number];
  /** Önerilen makam (turkishMusicKB MakamId, opsiyonel) */
  makamHint?: string;
  /** Lyrics yazımında kullanılacak somut Türk kültürel detaylar */
  culturalDetails: string[];
  /** Kullanıcı dostu özet (önizleme kartında gösterilir) */
  summary: string;
}

// ── Wizard Tipleri ──────────────────────────────────────────────────────────

export type WizardMoodId =
  | "huzunlu"
  | "romantik"
  | "enerjik"
  | "nostaljik"
  | "isyankar"
  | "huzurlu"
  | "coskulu"
  | "ozlem";

export type WizardThemeId =
  | "ask"
  | "ayrilik"
  | "gurbet"
  | "anne_baba"
  | "doga"
  | "hayat"
  | "custom";

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  mood: WizardMoodId | null;
  genreId: string | null;
  theme: WizardThemeId | null;
  themeText: string;
  vocalGender: "m" | "f" | "instrumental";
  era: "modern" | "klasik" | "90lar";
  regionId: string | null;
  model: string;
}

export interface WizardGenerateRequest {
  mood: WizardMoodId;
  genreId: string;
  theme: WizardThemeId;
  themeText: string;
  vocalGender: "m" | "f" | "instrumental";
  era: "modern" | "klasik" | "90lar";
  regionId?: string;
  model?: string;
}

export interface SunoSong {
  id: string;
  title: string;
  tags?: string;
  prompt?: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  duration?: number;
  status: string;
  created_at?: string;
}

export interface SunoApiResponse {
  code: number;
  msg: string;
  data?: {
    taskId?: string;
    sunoData?: SunoSong[];
  };
}
