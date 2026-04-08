import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTimelineForUser } from "../../src/services/timeline.js";
import { prisma } from "../../src/db.js";

vi.mock("../../src/db.js", () => ({
  prisma: {
    follow: { findMany: vi.fn() },
    tweet: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

const author = (id: string, username: string) => ({
  id,
  email: `${username}@t.dev`,
  username,
  passwordHash: "x",
  bio: "",
  avatarUrl: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
});

describe("getTimelineForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes self and following authors", async () => {
    vi.mocked(prisma.follow.findMany).mockResolvedValue([{ followingId: "b" }]);
    vi.mocked(prisma.tweet.findMany).mockResolvedValue([
      {
        id: "tw1",
        content: "hello",
        authorId: "a",
        createdAt: new Date("2025-01-02"),
        author: author("a", "alice"),
        likes: [{ id: "l1" }],
        _count: { likes: 2 },
      },
    ]);

    const r = await getTimelineForUser("a", null);

    expect(prisma.tweet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: { in: expect.arrayContaining(["a", "b"]) },
        }),
      })
    );
    expect(r.tweets[0].likedByMe).toBe(true);
    expect(r.tweets[0].likeCount).toBe(2);
    expect(r.nextCursor).toBeNull();
  });

  it("sets nextCursor when more than page size", async () => {
    vi.mocked(prisma.follow.findMany).mockResolvedValue([]);
    const many = Array.from({ length: 21 }).map((_, i) => ({
      id: `t${i}`,
      content: `${i}`,
      authorId: "a",
      createdAt: new Date(`2025-01-${String((i % 28) + 1).padStart(2, "0")}`),
      author: author("a", "alice"),
      likes: [] as { id: string }[],
      _count: { likes: 0 },
    }));
    vi.mocked(prisma.tweet.findMany).mockResolvedValue(many);

    const r = await getTimelineForUser("a", null);
    expect(r.tweets).toHaveLength(20);
    expect(r.nextCursor).toBe("t19");
  });

  it("uses cursor tweet for pagination filter", async () => {
    vi.mocked(prisma.follow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tweet.findUnique).mockResolvedValue({
      id: "c1",
      createdAt: new Date("2025-01-15"),
    });
    vi.mocked(prisma.tweet.findMany).mockResolvedValue([]);

    await getTimelineForUser("a", "c1");

    expect(prisma.tweet.findUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { id: true, createdAt: true },
    });
    expect(prisma.tweet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array),
        }),
      })
    );
  });
});
