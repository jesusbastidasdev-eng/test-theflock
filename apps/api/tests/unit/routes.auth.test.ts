import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "../helpers.js";
import { prisma } from "../../src/db.js";
import * as password from "../../src/auth/password.js";
import * as session from "../../src/auth/session.js";

vi.mock("../../src/db.js", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: { deleteMany: vi.fn() },
  },
}));

vi.mock("../../src/auth/password.js", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("../../src/auth/session.js", () => ({
  createSessionForUser: vi.fn(),
  deleteSessionByToken: vi.fn(),
  getUserFromSessionToken: vi.fn(),
}));

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/auth/register creates user and session", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      username: "alice",
      passwordHash: "h",
      bio: "",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(password.hashPassword).mockResolvedValue("hashed");
    vi.mocked(session.createSessionForUser).mockResolvedValue({
      token: "tok",
      expiresAt: new Date(Date.now() + 1000),
    });

    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "a@b.co", password: "12345678", username: "alice", bio: "hi" },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"] as string;
    expect(setCookie).toContain("session_token=");
    await app.close();
  });

  it("POST /api/auth/register 409 when taken", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "x",
      email: "a@b.co",
      username: "alice",
      passwordHash: "h",
      bio: "",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "a@b.co", password: "12345678", username: "alice" },
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it("POST /api/auth/login rejects bad password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      username: "alice",
      passwordHash: "h",
      bio: "",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(password.verifyPassword).mockResolvedValue(false);
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "a@b.co", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("POST /api/auth/login sets cookie on success", async () => {
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
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user);
    vi.mocked(password.verifyPassword).mockResolvedValue(true);
    vi.mocked(session.createSessionForUser).mockResolvedValue({
      token: "tok2",
      expiresAt: new Date(Date.now() + 1000),
    });
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "a@b.co", password: "right" },
    });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("session_token=");
    await app.close();
  });

  it("GET /api/auth/me unauthorized without session", async () => {
    vi.mocked(session.getUserFromSessionToken).mockResolvedValue(null);
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("POST /api/auth/logout clears session", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { cookie: "session_token=abc" },
    });
    expect(res.statusCode).toBe(200);
    expect(session.deleteSessionByToken).toHaveBeenCalledWith("abc");
    await app.close();
  });
});
