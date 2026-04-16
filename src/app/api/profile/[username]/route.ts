import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserByUsername,
  getUserSongs,
  getFollowerCount,
  getFollowingCount,
  getUserStats,
  isFollowing as checkIsFollowing,
} from "@/lib/taskStore";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const session = await auth();

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    const [songs, followerCount, followingCount, following, stats] =
      await Promise.all([
        getUserSongs(user.id),
        getFollowerCount(user.id),
        getFollowingCount(user.id),
        session?.user?.id
          ? checkIsFollowing(session.user.id, user.id)
          : Promise.resolve(false),
        getUserStats(user.id),
      ]);

    return NextResponse.json({
      user,
      songs,
      followerCount,
      followingCount,
      isFollowing: following,
      stats,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[profile]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
