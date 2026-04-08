import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "../helpers.js";
import { prisma } from "../../src/db.js";
import * as session from "../../src/auth/session.js";
import * as timeline from "../../src/services/timeline.js";

vi.mock("../../src/db.js", () => ({
  prisma: {
    tweet: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    like: { create: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("../../src/auth/session.js", () => ({
  getUserFromSessionToken: vi.fn(),
}));

vi.mock("../../src/services/timeline.js", () => ({
  getTimelineForUser: vi.fn(),
}));

const user = {
  id: "u1",
  email: "a@b.co",
  username: "alice",
  passwordHash: "h",
  bio: "",
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("tweet routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(session.getUserFromSessionToken).mockResolvedValue(user);
  });

  it("GET /api/timeline returns payload", async () => {
    vi.mocked(timeline.getTimelineForUser).mockResolvedValue({
      tweets: [],
      nextCursor: null,
    });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/timeline",
      headers: { cookie: "session_token=x" },
    });
    expect(res.statusCode).toBe(200);
    expect(timeline.getTimelineForUser).toHaveBeenCalled();
    await app.close();
  });

  it("POST /api/tweets validates body", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/tweets",
      headers: { cookie: "session_token=x" },
      payload: { content: "" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("POST /api/tweets creates tweet", async () => {
    vi.mocked(prisma.tweet.create).mockResolvedValue({
      id: "t1",
      content: "hi",
      authorId: "u1",
      createdAt: new Date(),
      author: user,
      likes: [] as { id: string }[],
      _count: { likes: 0 },
    } as never);
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/tweets",
      headers: { cookie: "session_token=x" },
      payload: { content: "hi" },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("DELETE /api/tweets/:id forbids non-owner", async () => {
    vi.mocked(prisma.tweet.findUnique).mockResolvedValue({
      id: "t1",
      content: "x",
      authorId: "other",
      createdAt: new Date(),
    });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/tweets/t1",
      headers: { cookie: "session_token=x" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("DELETE /api/tweets/:id deletes own", async () => {
    vi.mocked(prisma.tweet.findUnique).mockResolvedValue({
      id: "t1",
      content: "x",
      authorId: "u1",
      createdAt: new Date(),
    });
    vi.mocked(prisma.tweet.delete).mockResolvedValue({} as never);
    const app = await buildTestApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/tweets/t1",
      headers: { cookie: "session_token=x" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("POST like toggles counts", async () => {
    vi.mocked(prisma.tweet.findUnique).mockResolvedValue({
      id: "t1",
      content: "x",
      authorId: "u2",
      createdAt: new Date(),
    });
    vi.mocked(prisma.like.create).mockResolvedValue({} as never);
    vi.mocked(prisma.like.count).mockResolvedValue(3);
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/tweets/t1/like",
      headers: { cookie: "session_token=x" },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { likeCount: number }).likeCount).toBe(3);
    await app.close();
  });
});
