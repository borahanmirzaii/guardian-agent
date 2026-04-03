import { Auth0AI } from "@auth0/ai-vercel";
import { getRefreshToken, getUser } from "./auth0";

const auth0AI = new Auth0AI();

export const withGitHubRead = auth0AI.withTokenVault({
  connection: "github",
  scopes: ["repo", "read:user", "read:org"],
  refreshToken: getRefreshToken,
});

export const withGoogleRead = auth0AI.withTokenVault({
  connection: "google-oauth2",
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.settings.basic",
  ],
  refreshToken: getRefreshToken,
});

export const withStepUpRemediation = auth0AI.withAsyncAuthorization({
  userID: async () => {
    const user = await getUser();
    return user?.sub as string;
  },
  bindingMessage: async () => {
    return "Guardian needs elevated access to perform remediation. This grants write permissions for 60 seconds.";
  },
  scopes: ["openid", "write:remediate"],
  audience: process.env.AUTH0_AUDIENCE!,
  onAuthorizationRequest: "block",
});
