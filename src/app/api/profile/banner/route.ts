import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadAudioFromBuffer, keyToCdnUrl } from "@/lib/bunnyStorage";
import { updateProfileFields } from "@/lib/taskStore";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Banner 8MB'dan büyük olamaz" },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.test(file.type)) {
      return NextResponse.json(
        { error: "Sadece jpg/png/webp/gif" },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      file.type.split("/")[1] ||
      "jpg";
    const key = `banners/${session.user.id}-${Date.now()}.${ext}`;
    const stored = await uploadAudioFromBuffer(buffer, key);
    if (!stored) {
      return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
    }
    const url = keyToCdnUrl(stored);
    if (!url) {
      return NextResponse.json(
        { error: "CDN URL oluşturulamadı" },
        { status: 500 },
      );
    }
    await updateProfileFields(session.user.id, { bannerUrl: url });
    return NextResponse.json({ url, key: stored });
  } catch (e) {
    console.error("[profile/banner]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  await updateProfileFields(session.user.id, { bannerUrl: null });
  return NextResponse.json({ ok: true });
}
