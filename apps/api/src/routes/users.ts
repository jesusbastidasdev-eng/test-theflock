import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { getUserFromSessionToken } from "../auth/session.js";
import { toUserPublic } from "../validation.js";

const COOKIE = "session_token";

async function optionalUser(req: FastifyRequest) {
  const token = req.cookies[COOKIE];
  return getUserFromSessionToken(token);
}

async function requireUser(req: FastifyRequest) {
  const u = await optionalUser(req);
  return u;
}

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { username: string } }>("/users/:username/tweets", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    const me = await optionalUser(req);

    if (me) {
      const tweets = await prisma.tweet.findMany({
        where: { authorId: user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        include: {
          author: true,
          _count: { select: { likes: true } },
          likes: { where: { userId: me.id }, select: { id: true } },
        },
      });
      return reply.send({
        tweets: tweets.map((t) => ({
          id: t.id,
          content: t.content,
          authorId: t.authorId,
          createdAt: t.createdAt.toISOString(),
          author: toUserPublic(t.author),
          likeCount: t._count.likes,
          likedByMe: t.likes.length > 0,
        })),
      });
    }

    const tweets = await prisma.tweet.findMany({
      where: { authorId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      include: {
        author: true,
        _count: { select: { likes: true } },
      },
    });
    return reply.send({
      tweets: tweets.map((t) => ({
        id: t.id,
        content: t.content,
        authorId: t.authorId,
        createdAt: t.createdAt.toISOString(),
        author: toUserPublic(t.author),
        likeCount: t._count.likes,
        likedByMe: false,
      })),
    });
  });

  app.get("/users/search", async (req, reply) => {
    const qRaw = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q.trim() : "";
    const qp = req.query as { limit?: string; skip?: string };
    const limitRaw = Number.parseInt(typeof qp.limit === "string" ? qp.limit : "", 10);
    const skipRaw = Number.parseInt(typeof qp.skip === "string" ? qp.skip : "", 10);
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
    const skip = Math.max(0, Number.isFinite(skipRaw) ? skipRaw : 0);

    const where =
      qRaw.length >= 1
        ? {
            OR: [
              { username: { contains: qRaw, mode: "insensitive" } },
              { email: { contains: qRaw, mode: "insensitive" } },
            ],
          }
        : undefined;

    const rows = await prisma.user.findMany({
      where,
      orderBy: [{ username: "asc" }, { id: "asc" }],
      skip,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextSkip = hasMore ? skip + limit : null;

    return reply.send({
      users: page.map((u) => toUserPublic(u)),
      nextSkip,
    });
  });

  app.get<{ Params: { username: string } }>("/users/:username", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    const me = await optionalUser(req);
    let isFollowing = false;
    if (me && me.id !== user.id) {
      const f = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: me.id, followingId: user.id } },
      });
      isFollowing = !!f;
    }
    const [followerCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
    ]);
    return reply.send({
      user: toUserPublic(user),
      followerCount,
      followingCount,
      isFollowing,
      isSelf: me?.id === user.id,
    });
  });

  app.get<{ Params: { username: string } }>("/users/:username/followers", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    const rows = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: true },
    });
    return reply.send({ users: rows.map((r) => toUserPublic(r.follower)) });
  });

  app.get<{ Params: { username: string } }>("/users/:username/following", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    const rows = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: true },
    });
    return reply.send({ users: rows.map((r) => toUserPublic(r.following)) });
  });

  app.post<{ Params: { username: string } }>("/users/:username/follow", async (req, reply) => {
    const me = await requireUser(req);
    if (!me) return reply.code(401).send({ error: "Unauthorized" });
    const target = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) return reply.code(404).send({ error: "Not found" });
    if (target.id === me.id) return reply.code(400).send({ error: "Cannot follow yourself" });
    try {
      await prisma.follow.create({ data: { followerId: me.id, followingId: target.id } });
    } catch {
      /* already following */
    }
    return reply.send({ ok: true, isFollowing: true });
  });

  app.delete<{ Params: { username: string } }>("/users/:username/follow", async (req, reply) => {
    const me = await requireUser(req);
    if (!me) return reply.code(401).send({ error: "Unauthorized" });
    const target = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) return reply.code(404).send({ error: "Not found" });
    await prisma.follow.deleteMany({ where: { followerId: me.id, followingId: target.id } });
    return reply.send({ ok: true, isFollowing: false });
  });
};
