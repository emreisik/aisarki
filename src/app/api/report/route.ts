import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createReport } from "@/lib/taskStore";

const VALID_REASONS = new Set([
  "spam",
  "abuse",
  "copyright",
  "inappropriate",
  "other",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }
    const body = await req.json();
    const { targetType, targetId, reason, note } = body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      note?: string;
    };
    if (targetType !== "song" && targetType !== "user") {
      return NextResponse.json(
        { error: "Geçersiz hedef tipi" },
        { status: 400 },
      );
    }
    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json({ error: "Hedef gerekli" }, { status: 400 });
    }
    if (!reason || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: "Geçersiz sebep" }, { status: 400 });
    }
    const id = await createReport({
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      note: note?.slice(0, 500),
    });
    return NextResponse.json({ id, ok: true });
  } catch (e) {
    console.error("[report]", e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}
