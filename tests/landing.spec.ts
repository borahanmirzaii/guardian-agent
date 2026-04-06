import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders the Guardian Agent landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Guardian Agent");
  });

  test("shows the key principles", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Read-only by default")).toBeVisible();
    await expect(page.locator("text=Write-only with approval")).toBeVisible();
  });

  test("has a sign-in button linking to Auth0", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator('a[href="/auth/login?returnTo=/dashboard"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink.locator("button")).toContainText("Sign in with Auth0");
  });

  test("shows the tagline", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("text=AI security copilot that monitors your accounts")
    ).toBeVisible();
  });
});
