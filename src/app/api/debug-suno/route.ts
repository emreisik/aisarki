import { NextRequest, NextResponse } from "next/server";

const SUNO_API_KEY = process.env.SUNO_API_KEY ?? "";
const SUNO_BASE_URL = "https://api.sunoapi.org";

// Sadece development veya admin için — production'da kaldırılabilir
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { error: "taskId parametresi gereklidir" },
      { status: 400 },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(
      `${SUNO_BASE_URL}/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const raw = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    return NextResponse.json({
      httpStatus: res.status,
      httpOk: res.ok,
      rawLength: raw.length,
      data: parsed,
      preview: raw.slice(0, 2000),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: String(e),
        type: e instanceof Error ? e.constructor.name : typeof e,
      },
      { status: 500 },
    );
  }
}
