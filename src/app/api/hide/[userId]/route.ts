import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hideUser, unhideUser } from "@/lib/taskStore";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }
    if (session.user.id === targetId) {
      return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }
    await hideUser(session.user.id, targetId);
    return NextResponse.json({ hidden: true });
  } catch (e) {
    console.error("[hide]", e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }
    await unhideUser(session.user.id, targetId);
    return NextResponse.json({ hidden: false });
  } catch (e) {
    console.error("[unhide]", e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}
