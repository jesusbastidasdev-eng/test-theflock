import { afterAll, describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers.js";

describe("API smoke", () => {
  it("timeline returns 401 without session", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/timeline" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("register returns 400 on invalid email", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "bad", password: "12345678", username: "okuser" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
