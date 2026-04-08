import crypto from "node:crypto";
import { prisma } from "../db.js";

const SESSION_DAYS = 14;

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSessionForUser(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId, token, expiresAt },
  });
  return { token, expiresAt };
}

export async function getUserFromSessionToken(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function deleteSessionByToken(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
}
