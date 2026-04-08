import { describe, expect, it } from "vitest";
import { loginBodySchema, registerBodySchema, tweetBodySchema } from "../../src/validation.js";

describe("validation", () => {
  it("parses register body", () => {
    const v = registerBodySchema.parse({
      email: "a@b.co",
      password: "12345678",
      username: "ab_c",
    });
    expect(v.username).toBe("ab_c");
  });

  it("rejects short username", () => {
    expect(() => registerBodySchema.parse({ email: "a@b.co", password: "12345678", username: "a" })).toThrow();
  });

  it("parses tweet max length boundary", () => {
    const content = "x".repeat(280);
    const v = tweetBodySchema.parse({ content });
    expect(v.content.length).toBe(280);
  });

  it("rejects tweet too long", () => {
    expect(() => tweetBodySchema.parse({ content: "x".repeat(281) })).toThrow();
  });

  it("parses login", () => {
    const v = loginBodySchema.parse({ email: "a@b.co", password: "x" });
    expect(v.email).toBe("a@b.co");
  });
});
