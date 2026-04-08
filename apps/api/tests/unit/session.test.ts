import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSessionToken, deleteSessionByToken, getUserFromSessionToken } from "../../src/auth/session.js";
import { prisma } from "../../src/db.js";

vi.mock("../../src/db.js", () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSessionToken returns 64 hex chars", () => {
    const t = createSessionToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });

  it("getUserFromSessionToken returns null when no token", async () => {
    await expect(getUserFromSessionToken(undefined)).resolves.toBeNull();
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("getUserFromSessionToken deletes expired sessions", async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "s1",
      token: "t",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      user: {
        id: "u1",
        email: "a@b.co",
        username: "a",
        passwordHash: "x",
        bio: "",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await expect(getUserFromSessionToken("t")).resolves.toBeNull();
    expect(prisma.session.delete).toHaveBeenCalled();
  });

  it("deleteSessionByToken no-ops without token", async () => {
    await deleteSessionByToken(undefined);
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it("getUserFromSessionToken returns user when valid", async () => {
    const user = {
      id: "u1",
      email: "a@b.co",
      username: "a",
      passwordHash: "x",
      bio: "",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "s1",
      token: "t",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user,
    });
    await expect(getUserFromSessionToken("t")).resolves.toEqual(user);
  });
});
