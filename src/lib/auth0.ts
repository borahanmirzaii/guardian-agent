import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  appBaseUrl: process.env.AUTH0_BASE_URL,
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});

export async function getSession() {
  return auth0.getSession();
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function getRefreshToken() {
  const session = await getSession();
  return session?.tokenSet?.refreshToken as string;
}
