import { Metadata } from "next";
import { getSongById } from "@/lib/taskStore";
import SongClient from "./SongClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const song = await getSongById(id);

  if (!song) {
    return { title: "Şarkı bulunamadı – Rifmo" };
  }

  const title = song.creator
    ? `${song.title} — ${song.creator.name}`
    : song.title;
  const description = "Rifmo ile yapay zeka tarafından oluşturuldu";
  const url = `${process.env.APP_URL ?? "https://aisarki.com"}/song/${id}`;

  return {
    title: `${title} – Rifmo`,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Rifmo",
      type: "music.song",
      images: song.imageUrl
        ? [{ url: song.imageUrl, width: 1000, height: 1000, alt: song.title }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: song.imageUrl ? [song.imageUrl] : [],
    },
  };
}

export default function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SongClient params={params} />;
}
