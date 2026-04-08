import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { authRoutes } from "../src/routes/auth.js";
import { tweetRoutes } from "../src/routes/tweets.js";
import { userRoutes } from "../src/routes/users.js";

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(
    async (instance) => {
      await instance.register(authRoutes, { prefix: "/auth" });
      await instance.register(tweetRoutes);
      await instance.register(userRoutes);
    },
    { prefix: "/api" }
  );
  return app;
}
