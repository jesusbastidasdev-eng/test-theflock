import { prisma } from "../db.js";

const PAGE_SIZE = 20;

export async function getTimelineForUser(viewerId: string, cursor?: string | null) {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const authorIds = [...new Set([viewerId, ...following.map((f) => f.followingId)])];

  let cursorTweet: { id: string; createdAt: Date } | null = null;
  if (cursor) {
    cursorTweet = await prisma.tweet.findUnique({
      where: { id: cursor },
      select: { id: true, createdAt: true },
    });
  }

  const whereBase = { authorId: { in: authorIds } as const };
  const whereClause =
    cursorTweet != null
      ? {
          AND: [
            whereBase,
            {
              OR: [
                { createdAt: { lt: cursorTweet.createdAt } },
                {
                  AND: [{ createdAt: cursorTweet.createdAt }, { id: { lt: cursorTweet.id } }],
                },
              ],
            },
          ],
        }
      : whereBase;

  const tweets = await prisma.tweet.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    include: {
      author: true,
      likes: { where: { userId: viewerId }, select: { id: true } },
      _count: { select: { likes: true } },
    },
  });

  const hasMore = tweets.length > PAGE_SIZE;
  const page = hasMore ? tweets.slice(0, PAGE_SIZE) : tweets;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return {
    tweets: page.map((t) => ({
      id: t.id,
      content: t.content,
      authorId: t.authorId,
      createdAt: t.createdAt.toISOString(),
      author: {
        id: t.author.id,
        email: t.author.email,
        username: t.author.username,
        bio: t.author.bio ?? "",
        avatarUrl: t.author.avatarUrl,
        createdAt: t.author.createdAt.toISOString(),
      },
      likeCount: t._count.likes,
      likedByMe: t.likes.length > 0,
    })),
    nextCursor,
  };
}
