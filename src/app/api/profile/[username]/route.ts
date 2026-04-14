import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserByUsername,
  getUserSongs,
  getFollowerCount,
  getFollowingCount,
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

    const [songs, followerCount, followingCount, following] = await Promise.all(
      [
        getUserSongs(user.id),
        getFollowerCount(user.id),
        getFollowingCount(user.id),
        session?.user?.id
          ? checkIsFollowing(session.user.id, user.id)
          : Promise.resolve(false),
      ],
    );

    return NextResponse.json({
      user,
      songs,
      followerCount,
      followingCount,
      isFollowing: following,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[profile]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
