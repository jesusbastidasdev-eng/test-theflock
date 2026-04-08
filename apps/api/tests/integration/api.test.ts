import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers.js";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../src/db.js";
import argon2 from "argon2";

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("API integration", () => {
  let app: FastifyInstance;
  const email = `t_${Date.now()}@test.dev`;
  const username = `user_${Date.now()}`;
  const password = "Password123!";

  beforeAll(async () => {
    app = await buildTestApp();
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
  });

  it("registers and sets session cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password, username, bio: "bio" },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const body = res.json() as { user: { username: string } };
    expect(body.user.username).toBe(username);
  });

  it("returns current user from /me with cookie", async () => {
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: `me_${Date.now()}@test.dev`, password, username: `me_${Date.now()}`, bio: "" },
    });
    const cookie = reg.headers["set-cookie"] as string;
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects login with bad password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "nope" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("logs in and creates tweet", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password },
    });
    const cookie = login.headers["set-cookie"] as string;
    const tw = await app.inject({
      method: "POST",
      url: "/api/tweets",
      headers: { cookie },
      payload: { content: "Hello integration test" },
    });
    expect(tw.statusCode).toBe(201);
    const id = (tw.json() as { tweet: { id: string } }).tweet.id;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/tweets/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(200);
  });

  it("follow and search", async () => {
    const hash = await argon2.hash(password);
    const u1 = await prisma.user.create({
      data: { email: `a_${Date.now()}@t.dev`, username: `a_${Date.now()}`, passwordHash: hash },
    });
    const u2 = await prisma.user.create({
      data: { email: `b_${Date.now()}@t.dev`, username: `b_${Date.now()}`, passwordHash: hash },
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: u1.email, password },
    });
    const cookie = login.headers["set-cookie"] as string;
    const fol = await app.inject({
      method: "POST",
      url: `/api/users/${u2.username}/follow`,
      headers: { cookie },
    });
    expect(fol.statusCode).toBe(200);
    const search = await app.inject({
      method: "GET",
      url: `/api/users/search?q=${encodeURIComponent(u2.username.slice(0, 6))}`,
    });
    expect(search.statusCode).toBe(200);
    const users = (search.json() as { users: unknown[] }).users;
    expect(users.length).toBeGreaterThan(0);
    await prisma.user.deleteMany({ where: { id: { in: [u1.id, u2.id] } } });
  });
});
