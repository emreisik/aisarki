import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTaskPayload, dismissFailedTask } from "@/lib/taskStore";

/**
 * Başarısız bir task'ı aynı payload ile yeniden çalıştırır.
 * Eski failed task'ı siler, generate endpoint'ine payload'ı gönderir.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: taskId } = await params;

  const task = await getTaskPayload(taskId);
  if (!task) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
  }
  if (task.userId !== session.user.id) {
    return NextResponse.json({ error: "Yetkin yok" }, { status: 403 });
  }
  if (!task.payload) {
    return NextResponse.json(
      {
        error:
          "Bu görev eski format — payload kayıtlı değil, yeniden çalıştırılamaz",
      },
      { status: 400 },
    );
  }

  // Hedef endpoint: sounds veya music (default: music)
  const endpoint = task.endpoint === "sounds" ? "generate-sounds" : "generate";
  const { origin } = new URL(request.url);
  const targetUrl = `${origin}/api/${endpoint}`;

  // Authorization forward
  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(task.payload),
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Başarılıysa eski failed task'ı temizle
    await dismissFailedTask(taskId, session.user.id);

    return NextResponse.json({
      ok: true,
      newTaskId: data.data?.taskId,
      message: "Yeniden üretim başlatıldı",
    });
  } catch (e) {
    console.error("[retry] error:", e);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
