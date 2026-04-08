import { test, expect } from "@playwright/test";

test("signup, logout, login", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const username = `u${Date.now()}`;
  const password = "Password123!";

  await page.goto("/signup");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^username$/i).fill(username);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /home/i })).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 15_000 });

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });
});
