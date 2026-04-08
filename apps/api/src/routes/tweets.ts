import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { getUserFromSessionToken } from "../auth/session.js";
import { toUserPublic, tweetBodySchema } from "../validation.js";
import { getTimelineForUser } from "../services/timeline.js";
import { ZodError } from "zod";

const COOKIE = "session_token";

async function requireUser(req: FastifyRequest) {
  const token = req.cookies[COOKIE];
  return getUserFromSessionToken(token);
}

export const tweetRoutes: FastifyPluginAsync = async (app) => {
  app.get("/timeline", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const cursor =
      typeof (req.query as { cursor?: string }).cursor === "string"
        ? (req.query as { cursor: string }).cursor
        : undefined;
    const data = await getTimelineForUser(user.id, cursor ?? null);
    return reply.send(data);
  });

  app.post("/tweets", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    try {
      const body = tweetBodySchema.parse(req.body);
      const tweet = await prisma.tweet.create({
        data: { content: body.content, authorId: user.id },
        include: {
          author: true,
          likes: { where: { userId: user.id }, select: { id: true } },
          _count: { select: { likes: true } },
        },
      });
      return reply.code(201).send({
        tweet: {
          id: tweet.id,
          content: tweet.content,
          authorId: tweet.authorId,
          createdAt: tweet.createdAt.toISOString(),
          author: toUserPublic(tweet.author),
          likeCount: tweet._count.likes,
          likedByMe: tweet.likes.length > 0,
        },
      });
    } catch (e) {
      if (e instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid input", details: e.flatten() });
      }
      throw e;
    }
  });

  app.delete<{ Params: { id: string } }>("/tweets/:id", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const tweet = await prisma.tweet.findUnique({ where: { id: req.params.id } });
    if (!tweet) return reply.code(404).send({ error: "Not found" });
    if (tweet.authorId !== user.id) return reply.code(403).send({ error: "Forbidden" });
    await prisma.tweet.delete({ where: { id: tweet.id } });
    return reply.send({ ok: true });
  });

  app.post<{ Params: { id: string } }>("/tweets/:id/like", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const tweet = await prisma.tweet.findUnique({ where: { id: req.params.id } });
    if (!tweet) return reply.code(404).send({ error: "Not found" });
    try {
      await prisma.like.create({ data: { userId: user.id, tweetId: tweet.id } });
    } catch {
      /* unique violation — idempotent like */
    }
    const count = await prisma.like.count({ where: { tweetId: tweet.id } });
    return reply.send({ likeCount: count, likedByMe: true });
  });

  app.delete<{ Params: { id: string } }>("/tweets/:id/like", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const tweet = await prisma.tweet.findUnique({ where: { id: req.params.id } });
    if (!tweet) return reply.code(404).send({ error: "Not found" });
    await prisma.like.deleteMany({ where: { userId: user.id, tweetId: tweet.id } });
    const count = await prisma.like.count({ where: { tweetId: tweet.id } });
    return reply.send({ likeCount: count, likedByMe: false });
  });
};
