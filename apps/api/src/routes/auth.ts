import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import { createSessionForUser, deleteSessionByToken, getUserFromSessionToken } from "../auth/session.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { loginBodySchema, registerBodySchema, toUserPublic } from "../validation.js";
import { ZodError } from "zod";

const COOKIE = "session_token";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (req, reply) => {
    try {
      const body = registerBodySchema.parse(req.body);
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email: body.email }, { username: body.username }] },
      });
      if (existing) {
        return reply.code(409).send({ error: "Email or username already taken" });
      }
      const passwordHash = await hashPassword(body.password);
      const user = await prisma.user.create({
        data: {
          email: body.email,
          username: body.username,
          passwordHash,
          bio: body.bio ?? "",
        },
      });
      const { token, expiresAt } = await createSessionForUser(user.id);
      reply.setCookie(COOKIE, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
      });
      return reply.send({ user: toUserPublic(user) });
    } catch (e) {
      if (e instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid input", details: e.flatten() });
      }
      throw e;
    }
  });

  app.post("/login", async (req, reply) => {
    try {
      const body = loginBodySchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      const okI = await verifyPassword(user.passwordHash, body.password);
      if (!okI) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      const { token, expiresAt } = await createSessionForUser(user.id);
      reply.setCookie(COOKIE, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: expiresAt,
      });
      return reply.send({ user: toUserPublic(user) });
    } catch (e) {
      if (e instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid input", details: e.flatten() });
      }
      throw e;
    }
  });

  app.post("/logout", async (req, reply) => {
    const token = req.cookies[COOKIE];
    await deleteSessionByToken(token);
    reply.clearCookie(COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/me", async (req, reply) => {
    const token = req.cookies[COOKIE];
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    return reply.send({ user: toUserPublic(user) });
  });
};
