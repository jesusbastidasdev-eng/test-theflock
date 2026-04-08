import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/auth/password.js";

describe("password", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword(h, "secret123")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });
});
