import "./load-env.js";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";
import { tweetRoutes } from "./routes/tweets.js";
import { userRoutes } from "./routes/users.js";

const PORT = Number(process.env.API_PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: WEB_ORIGIN,
  credentials: true,
});
await app.register(cookie);
await app.register(
  async (instance) => {
    await instance.register(authRoutes, { prefix: "/auth" });
    await instance.register(tweetRoutes);
    await instance.register(userRoutes);
  },
  { prefix: "/api" }
);

app.get("/health", async () => ({ ok: true }));

async function main() {
  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
