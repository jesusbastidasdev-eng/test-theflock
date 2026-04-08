import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(160).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const tweetBodySchema = z.object({
  content: z.string().min(1).max(280),
});

export const toUserPublic = (u: {
  id: string;
  email: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  passwordHash?: string;
}) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  bio: u.bio ?? "",
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt.toISOString(),
});
