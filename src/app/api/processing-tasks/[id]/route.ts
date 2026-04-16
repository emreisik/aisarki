import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelTask } from "@/lib/taskStore";

/** Task'ı iptal et — processing veya failed fark etmez. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await cancelTask(id, session.user.id);
  return NextResponse.json({ ok: true });
}
