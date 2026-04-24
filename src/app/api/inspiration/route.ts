import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

/**
 * İlham — Suno Boost Style ile basit bir style/tag ifadesini
 * detaylı, prodüksiyon-hazır bir prompt'a dönüştürür.
 * POST /api/inspiration
 *
 * Body: { content: string }   (örn: "arabesk", "lo-fi chill", veya şarkının style alanı)
 * Returns: { result: string } detaylı style metni
 *
 * Sync endpoint — callback yok, doğrudan dönüş.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content } = body as { content: string };

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "content boş olamaz" },
        { status: 400 },
      );
    }

    const response = await fetch(`${SUNO_BASE_URL}/api/v1/style/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({ content: content.slice(0, 500) }),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      return NextResponse.json(
        {
          error: data.message || data.msg || "İlham üretilemedi, tekrar dene",
        },
        { status: 400 },
      );
    }

    const result =
      (data.data?.result as string) || (data.data?.param as string) || "";

    if (!result) {
      return NextResponse.json(
        { error: "Boş yanıt — tekrar dene" },
        { status: 502 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Inspiration error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
