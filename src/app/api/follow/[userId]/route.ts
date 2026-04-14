import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleFollow, getFollowerCount } from "@/lib/taskStore";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }

    const { userId: followingId } = await params;

    if (session.user.id === followingId) {
      return NextResponse.json(
        { error: "Kendinizi takip edemezsiniz" },
        { status: 400 },
      );
    }

    const following = await toggleFollow(session.user.id, followingId);
    const followerCount = await getFollowerCount(followingId);

    return NextResponse.json({ following, followerCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[follow]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
