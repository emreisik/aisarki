import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteComment } from "@/lib/taskStore";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteComment(id, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "Silme yetkisi yok" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
