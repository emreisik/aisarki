import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addComment, getComments } from "@/lib/taskStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const comments = await getComments(id, 100);
  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Yorum boş olamaz" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json(
      { error: "Yorum en fazla 1000 karakter olabilir" },
      { status: 400 },
    );
  }
  const comment = await addComment(id, session.user.id, text);
  if (!comment) {
    return NextResponse.json({ error: "Yorum eklenemedi" }, { status: 500 });
  }
  return NextResponse.json({ comment });
}
