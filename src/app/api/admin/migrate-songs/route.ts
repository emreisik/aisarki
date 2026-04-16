import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";
import { checkAdminToken } from "@/lib/adminAuth";

/** POST /api/admin/migrate-songs
 *  Sahipsiz (created_by = NULL) şarkı ve task'ları **admin tarafından** hedef
 *  user'a atar. Önceden her login kullanıcı kendine atayabiliyordu — başkasının
 *  null-ownership data'sını sahiplenme açığı vardı. Artık ADMIN_HEAL_TOKEN şart.
 *
 *  Auth: Authorization: Bearer <ADMIN_HEAL_TOKEN>
 *  Body: { targetUserId: string } — hangi user'a atansın. Yoksa session user'a. */
export async function POST(req: NextRequest) {
  const authz = checkAdminToken(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  let targetUserId: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.targetUserId === "string") {
      targetUserId = body.targetUserId;
    }
  } catch {
    /* body opsiyonel */
  }

  if (!targetUserId) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "targetUserId body veya session şart" },
        { status: 400 },
      );
    }
    targetUserId = session.user.id;
  }

  const songsResult = await sql`
    UPDATE songs
    SET created_by = ${targetUserId}
    WHERE created_by IS NULL
    RETURNING id
  `;
  const tasksResult = await sql`
    UPDATE tasks
    SET created_by = ${targetUserId}
    WHERE created_by IS NULL
    RETURNING task_id
  `;

  return NextResponse.json({
    ok: true,
    updatedSongs: songsResult.length,
    updatedTasks: tasksResult.length,
    targetUserId,
  });
}
