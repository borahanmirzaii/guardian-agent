import { test, expect } from "@playwright/test";

test.describe("Navigation & Structure", () => {
  test("landing page has correct meta title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Guardian Agent/);
  });

  test("landing page shields icon renders", async ({ page }) => {
    await page.goto("/");
    // The Shield icon container
    const iconContainer = page.locator(".rounded-2xl.bg-emerald-500\\/10");
    await expect(iconContainer).toBeVisible();
  });

  test("unauthenticated user cannot access threats page", async ({ page }) => {
    await page.goto("/dashboard/threats");
    await page.waitForURL(/auth\/login|auth0\.com/, { timeout: 10_000 });
  });

  test("unauthenticated user cannot access agent page", async ({ page }) => {
    await page.goto("/dashboard/agent");
    await page.waitForURL(/auth\/login|auth0\.com/, { timeout: 10_000 });
  });

  test("unauthenticated user cannot access audit page", async ({ page }) => {
    await page.goto("/dashboard/audit");
    await page.waitForURL(/auth\/login|auth0\.com/, { timeout: 10_000 });
  });

  test("unauthenticated user cannot access connections page", async ({ page }) => {
    await page.goto("/dashboard/connections");
    await page.waitForURL(/auth\/login|auth0\.com/, { timeout: 10_000 });
  });
});
