import { Page } from "@playwright/test";

const MOCK_USER = {
  sub: "auth0|test-user-e2e",
  name: "Test User",
  email: "test@guardian.dev",
  picture: "",
};

/**
 * Mock authenticated session by intercepting Auth0 session checks
 * and API routes that require auth.
 */
export async function mockAuthSession(page: Page) {
  // Intercept the Auth0 session endpoint — return a mock session
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    })
  );

  // Intercept login redirects — just go to dashboard
  await page.route("**/auth/login**", (route) => {
    route.fulfill({
      status: 302,
      headers: { Location: "/dashboard" },
    });
  });
}

/**
 * Mock the scan API to return predictable findings
 */
export async function mockScanAPI(page: Page) {
  await page.route("**/api/scan", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          scan_id: "scan_test_123",
          status: "completed",
          findings_count: 3,
        }),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock the remediate API
 */
export async function mockRemediateAPI(page: Page) {
  await page.route("**/api/remediate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        remediation_id: 1,
        result: 'Created GitHub issue on guardian-test-repo: "Security Alert"',
        message: "Remediation complete — access reverted to read-only",
      }),
    })
  );
}

/**
 * Mock the agent API with a streaming response
 */
export async function mockAgentAPI(page: Page) {
  await page.route("**/api/agent", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: 'e:{"type":"text","value":"I\'ll scan your GitHub repositories for exposed secrets now."}\ne:{"type":"finish"}\n',
    })
  );
}

export { MOCK_USER };
