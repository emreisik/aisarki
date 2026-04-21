import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadAudioFromBuffer } from "@/lib/bunnyStorage";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dosya 50MB'dan büyük olamaz" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "mp3";
    const fileName = `uploads/${session.user.id}-${Date.now()}.${ext}`;

    const key = await uploadAudioFromBuffer(buffer, fileName);
    if (!key) {
      return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
    }

    // CDN URL döndür
    const cdnBase = process.env.BUNNY_CDN_URL || "";
    const url = `https://${cdnBase}/${key}`;

    return NextResponse.json({ url, key });
  } catch (e) {
    console.error("[upload-audio] error:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
