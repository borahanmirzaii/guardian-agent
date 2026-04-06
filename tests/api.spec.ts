import { test, expect } from "@playwright/test";

test.describe("API Security", () => {
  test("POST /api/scan requires authentication", async ({ request }) => {
    const res = await request.post("/api/scan");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/remediate requires authentication", async ({ request }) => {
    const res = await request.post("/api/remediate", {
      data: { finding_id: 1, action: "create_issue" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/remediate validates required fields", async ({ request }) => {
    // Even without auth, the 401 should come first
    const res = await request.post("/api/remediate", {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/agent requires authentication", async ({ request }) => {
    const res = await request.post("/api/agent", {
      data: { messages: [{ role: "user", content: "hello" }] },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/audit requires authentication", async ({ request }) => {
    const res = await request.get("/api/audit");
    expect(res.status()).toBe(401);
  });

  test("GET /api/dashboard/stats requires authentication", async ({ request }) => {
    const res = await request.get("/api/dashboard/stats");
    expect(res.status()).toBe(401);
  });
});
