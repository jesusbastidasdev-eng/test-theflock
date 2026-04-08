import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "../helpers.js";
import { prisma } from "../../src/db.js";
import * as session from "../../src/auth/session.js";

vi.mock("../../src/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    tweet: { findMany: vi.fn() },
    follow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../../src/auth/session.js", () => ({
  getUserFromSessionToken: vi.fn(),
}));

const u = (username: string, id = "id_" + username) => ({
  id,
  email: `${username}@t.dev`,
  username,
  passwordHash: "h",
  bio: "b",
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("user routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/users/search empty q", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/users/search" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { users: unknown[] }).users).toEqual([]);
    await app.close();
  });

  it("GET /api/users/search finds users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([u("alice")]);
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/users/search?q=al" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { users: { username: string }[] }).users[0].username).toBe("alice");
    await app.close();
  });

  it("GET /api/users/:username returns profile", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(u("bob", "ubob"));
    vi.mocked(session.getUserFromSessionToken).mockResolvedValue(null);
    vi.mocked(prisma.follow.count).mockResolvedValueOnce(2).mockResolvedValueOnce(5);
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/users/bob" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { followerCount: number; user: { username: string } };
    expect(body.user.username).toBe("bob");
    expect(body.followerCount).toBe(2);
    await app.close();
  });

  it("POST follow requires auth", async () => {
    vi.mocked(session.getUserFromSessionToken).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(u("bob"));
    const app = await buildTestApp();
    const res = await app.inject({ method: "POST", url: "/api/users/bob/follow" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("POST follow works", async () => {
    vi.mocked(session.getUserFromSessionToken).mockResolvedValue(u("alice", "a1"));
    vi.mocked(prisma.user.findUnique).mockResolvedValue(u("bob", "b1"));
    vi.mocked(prisma.follow.create).mockResolvedValue({} as never);
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/users/bob/follow",
      headers: { cookie: "session_token=x" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("GET /api/users/:username/tweets maps payload", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(u("bob", "b1"));
    vi.mocked(session.getUserFromSessionToken).mockResolvedValue(null);
    vi.mocked(prisma.tweet.findMany).mockResolvedValue([
      {
        id: "t1",
        content: "c",
        authorId: "b1",
        createdAt: new Date(),
        author: u("bob", "b1"),
        _count: { likes: 1 },
      } as never,
    ]);
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/users/bob/tweets" });
    expect(res.statusCode).toBe(200);
    const tweets = (res.json() as { tweets: { likedByMe: boolean }[] }).tweets;
    expect(tweets[0].likedByMe).toBe(false);
    await app.close();
  });
});
