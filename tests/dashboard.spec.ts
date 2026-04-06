import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    // Auth0 middleware should redirect to login
    await page.waitForURL(/auth\/login|auth0\.com/, { timeout: 10_000 });
  });

  test("API returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/scan");
    expect(res.status()).toBe(401);
  });

  test("scan results API returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/scan/results?user_id=test");
    expect(res.status()).toBe(401);
  });

  test("remediate API returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/remediate", {
      data: { finding_id: 1, action: "create_issue" },
    });
    expect(res.status()).toBe(401);
  });

  test("agent API returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/agent", {
      data: { messages: [] },
    });
    expect(res.status()).toBe(401);
  });
});
