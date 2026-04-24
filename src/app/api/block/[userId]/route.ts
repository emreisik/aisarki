import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  blockUser,
  unblockUser,
  isBlocked as checkBlocked,
} from "@/lib/taskStore";

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
      return NextResponse.json(
        { error: "Kendini engelleyemezsin" },
        { status: 400 },
      );
    }
    await blockUser(session.user.id, targetId);
    return NextResponse.json({ blocked: true });
  } catch (e) {
    console.error("[block]", e);
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
    await unblockUser(session.user.id, targetId);
    return NextResponse.json({ blocked: false });
  } catch (e) {
    console.error("[unblock]", e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ blocked: false });
    }
    const blocked = await checkBlocked(session.user.id, targetId);
    return NextResponse.json({ blocked });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}
