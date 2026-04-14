import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/lib/db";

// POST /api/admin/migrate-songs
// created_by = NULL olan tüm şarkıları ve task'ları mevcut kullanıcıya bağlar
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmalısın" }, { status: 401 });
  }

  const userId = session.user.id;

  // Kolon yoksa ekle (idempotent)
  try {
    await sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS created_by TEXT`;
  } catch {
    /* zaten var */
  }
  try {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT`;
  } catch {
    /* zaten var */
  }

  // Sahipsiz şarkıları bu kullanıcıya ata
  const songsResult = await sql`
    UPDATE songs
    SET created_by = ${userId}
    WHERE created_by IS NULL
    RETURNING id
  `;

  // Sahipsiz task'ları da ata
  const tasksResult = await sql`
    UPDATE tasks
    SET created_by = ${userId}
    WHERE created_by IS NULL
    RETURNING task_id
  `;

  return NextResponse.json({
    ok: true,
    updatedSongs: songsResult.length,
    updatedTasks: tasksResult.length,
    userId,
  });
}
