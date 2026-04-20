import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPersonaById, deletePersona } from "@/lib/taskStore";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { id } = await params;
  const persona = await getPersonaById(id);

  if (!persona || persona.userId !== session.user.id) {
    return NextResponse.json({ error: "Persona bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({ persona });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deletePersona(id, session.user.id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Persona bulunamadı veya size ait değil" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
