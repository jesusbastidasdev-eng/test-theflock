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
    const q = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q.trim() : "";
    if (q.length < 1) {
      return reply.send({ users: [] });
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { username: "asc" },
    });
    return reply.send({ users: users.map((u) => toUserPublic(u)) });
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
