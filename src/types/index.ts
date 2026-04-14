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
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  instrumental?: boolean;
  customMode?: boolean;
}

export interface SunoGeneratePayload {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  prompt?: string;
  style?: string;
  title?: string;
  negativeTags?: string;
  callBackUrl?: string;
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
