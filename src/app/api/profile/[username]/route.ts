import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserByUsername,
  getUserSongs,
  getUserTopSongs,
  getFollowerCount,
  getFollowingCount,
  getUserStats,
  isFollowing as checkIsFollowing,
  isBlocked,
  getUserProfileExtras,
  getSuggestedGenreTags,
  getRemixesInspiredCount,
} from "@/lib/taskStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const session = await auth();
    const sort = req.nextUrl.searchParams.get("sort") ?? "recent";

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 },
      );
    }

    const viewerId = session?.user?.id ?? null;
    const songsPromise =
      sort === "top"
        ? getUserTopSongs(user.id, 200, viewerId)
        : getUserSongs(user.id, viewerId);

    const [
      songs,
      followerCount,
      followingCount,
      following,
      stats,
      extras,
      remixesInspiredCount,
      blockedByViewer,
    ] = await Promise.all([
      songsPromise,
      getFollowerCount(user.id),
      getFollowingCount(user.id),
      session?.user?.id
        ? checkIsFollowing(session.user.id, user.id)
        : Promise.resolve(false),
      getUserStats(user.id),
      getUserProfileExtras(user.id),
      getRemixesInspiredCount(user.id),
      session?.user?.id
        ? isBlocked(session.user.id, user.id)
        : Promise.resolve(false),
    ]);

    // Genre tag'leri boşsa son şarkıların style alanından otomatik çıkar
    let genreTags = extras.genreTags;
    if (!genreTags || genreTags.length === 0) {
      genreTags = await getSuggestedGenreTags(user.id, 5);
    }

    return NextResponse.json({
      user,
      songs,
      songCount: songs.length,
      followerCount,
      followingCount,
      isFollowing: following,
      stats,
      bio: extras.bio,
      bannerUrl: extras.bannerUrl,
      genreTags,
      genreTagsAuto: extras.genreTags.length === 0,
      remixesInspiredCount,
      isBlocked: blockedByViewer,
      sort,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[profile]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
