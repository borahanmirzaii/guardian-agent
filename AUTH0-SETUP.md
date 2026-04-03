# Auth0 Tenant Setup — Guardian Agent

Step-by-step instructions to configure Auth0 for Guardian's progressive authorization flow.

## Prerequisites

- Auth0 account with **Token Vault access** (request at [community.auth0.com](https://community.auth0.com) — it's gated)
- GitHub OAuth App credentials
- Google OAuth 2.0 credentials
- Guardian Agent code running locally (`pnpm dev`)

---

## 1. Auth0 Application

### 1.1 Create Regular Web Application

```
Auth0 Dashboard → Applications → Create Application
  Name: Guardian Agent
  Type: Regular Web Applications
  → Create
```

### 1.2 Configure Application Settings

```
Settings tab:
  Allowed Callback URLs:        http://localhost:3000/auth/callback
  Allowed Logout URLs:          http://localhost:3000
  Allowed Web Origins:          http://localhost:3000

  (For production, add your Vercel URL to each)
```

### 1.3 Enable Required Grants

```
Settings → Advanced Settings → Grant Types:
  ✅ Authorization Code
  ✅ Refresh Token
  ✅ Client Credentials
  ✅ Token Exchange (urn:ietf:params:oauth:grant-type:token-exchange)
  ✅ CIBA (urn:openid:params:grant-type:ciba)
```

### 1.4 Enable Refresh Token Rotation

```
Settings → Refresh Token Rotation:
  Rotation: ✅ Enabled
  Reuse Interval: 0 seconds
```

### 1.5 Copy Credentials

Copy these into `.env.local`:

```env
AUTH0_DOMAIN=dev-3o1tehxthhxupbyz.us.auth0.com
AUTH0_ISSUER_BASE_URL=https://dev-3o1tehxthhxupbyz.us.auth0.com
AUTH0_CLIENT_ID=5HFFJeDRNvOnhSErxdF5uAXJaWj0Is5b
AUTH0_CLIENT_SECRET=bYcOY9w40NGpMz5wPW3fWSR5EoRIxgI5YufMmxeeK8vr7w0g8CPUzOf32PXzBgBT
AUTH0_SECRET=<run: openssl rand -hex 32>
AUTH0_BASE_URL=http://localhost:3000
```

---

## 2. API (Resource Server)

### 2.1 Create API

```
Auth0 Dashboard → APIs → Create API
  Name: Guardian API
  Identifier: https://guardian-agent.local/api
  Signing Algorithm: RS256
```

### 2.2 Define Permissions (Scopes)

```
Permissions tab → Add:
  read:scan          Allow reading scan results
  write:remediate    Allow executing remediation actions (step-up only)
```

### 2.3 Enable RBAC

```
Settings tab:
  ✅ Enable RBAC
  ✅ Add Permissions in the Access Token
```

### 2.4 Update `.env.local`

```env
AUTH0_AUDIENCE=https://guardian-agent.local/api
```

---

## 3. Social Connections

### 3.1 GitHub Connection (Read-Only)

#### Create GitHub OAuth App

```
GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
  Application name: Guardian Agent
  Homepage URL: http://localhost:3000
  Authorization callback URL: https://dev-3o1tehxthhxupbyz.us.auth0.com/login/callback
```

Copy the Client ID and Client Secret.

#### Configure in Auth0

```
Auth0 Dashboard → Authentication → Social → Create Connection → GitHub
  Client ID: <from GitHub>
  Client Secret: <from GitHub>

  Permissions (scopes):
    ✅ repo           (read access to repositories)
    ✅ read:user      (read user profile)
    ✅ read:org       (read org membership)

  ❌ Do NOT enable: admin:org, delete_repo, write:packages, etc.
```

#### Enable Token Vault for GitHub

```
Auth0 Dashboard → Authentication → Social → GitHub → Advanced
  Token Vault: ✅ Enable
  Store Refresh Tokens: ✅ Enable

  (This allows Token Vault to exchange tokens for GitHub access)
```

#### Enable for Guardian App

```
Auth0 Dashboard → Authentication → Social → GitHub → Applications
  ✅ Guardian Agent
```

### 3.2 Google Connection (Read-Only)

#### Create Google OAuth 2.0 Credentials

```
Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth Client ID
  Application type: Web application
  Name: Guardian Agent
  Authorized redirect URIs: https://dev-3o1tehxthhxupbyz.us.auth0.com/login/callback
```

#### Enable Required Google APIs

```
Google Cloud Console → APIs & Services → Library:
  ✅ Gmail API
```

#### Configure in Auth0

```
Auth0 Dashboard → Authentication → Social → Create Connection → Google / Gmail
  Client ID: <from Google Cloud Console>
  Client Secret: <from Google Cloud Console>

  Permissions (scopes):
    ✅ email
    ✅ profile
    ✅ https://www.googleapis.com/auth/gmail.readonly
    ✅ https://www.googleapis.com/auth/gmail.settings.basic

  ❌ Do NOT enable: gmail.modify, gmail.compose, gmail.settings.sharing (these are step-up only)
```

#### Enable Token Vault for Google

```
Auth0 Dashboard → Authentication → Social → Google → Advanced
  Token Vault: ✅ Enable
  Store Refresh Tokens: ✅ Enable
```

#### Enable for Guardian App

```
Auth0 Dashboard → Authentication → Social → Google → Applications
  ✅ Guardian Agent
```

---

## 4. Token Vault Configuration

### 4.1 Enable Token Vault on Tenant

```
Auth0 Dashboard → Settings → Advanced → Token Vault
  ✅ Enable Token Vault

  (If this option is not visible, Token Vault access has not been granted yet.
   Request at community.auth0.com)
```

### 4.2 Verify Token Exchange Works

Test with curl (replace tokens with real values):

```bash
curl -X POST https://dev-3o1tehxthhxupbyz.us.auth0.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
    "subject_token": "<USER_REFRESH_TOKEN>",
    "subject_token_type": "urn:ietf:params:oauth:token-type:refresh_token",
    "client_id": "5HFFJeDRNvOnhSErxdF5uAXJaWj0Is5b",
    "client_secret": "bYcOY9w40NGpMz5wPW3fWSR5EoRIxgI5YufMmxeeK8vr7w0g8CPUzOf32PXzBgBT",
    "audience": "https://guardian-agent.local/api",
    "connection": "github",
    "scope": "repo read:user"
  }'
```

Expected: returns `{ "access_token": "gho_...", "token_type": "Bearer" }`

---

## 5. CIBA (Client-Initiated Backchannel Authentication)

CIBA enables step-up authorization — the agent pauses and asks the user to approve elevated access.

### 5.1 Enable CIBA on Tenant

```
Auth0 Dashboard → Settings → Advanced → CIBA
  ✅ Enable CIBA
  Delivery Mode: Poll (default)
```

### 5.2 Configure Push Notification Provider (Optional)

For production, configure Auth0 Guardian or a custom push provider. For hackathon demo, **poll mode** works — the agent polls Auth0 until the user approves via the Auth0 consent screen.

### 5.3 CIBA Flow in Guardian

The SDK handles this automatically via `withAsyncAuthorization()`:

```
1. Agent calls tool wrapped with withAsyncAuthorization
2. SDK sends CIBA request to Auth0: POST /bc-authorize
3. User gets notification or sees consent prompt
4. User approves → Auth0 returns access token with elevated scopes
5. Agent uses elevated token for 60s → token expires
```

---

## 6. Connect Account Endpoint

Guardian uses Auth0's "Connect Account" feature to let users link GitHub/Google after initial login.

### 6.1 Enable in Auth0

```
Auth0 Dashboard → Applications → Guardian Agent → Addons → Connect Account
  ✅ Enable
```

This is also enabled in code via:
```typescript
const auth0 = new Auth0Client({
  // ... automatically handles /auth/connect endpoint
});
```

### 6.2 User Flow

```
1. User logs in via Auth0 Universal Login
2. User clicks "Connect GitHub" → redirects to /auth/login?connection=github
3. GitHub OAuth consent screen → user grants read-only access
4. Auth0 stores tokens in Token Vault
5. Guardian can now exchange for GitHub access tokens
```

---

## 7. Final `.env.local`

```env
# Auth0
AUTH0_SECRET=<openssl rand -hex 32>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://dev-3o1tehxthhxupbyz.us.auth0.com
AUTH0_DOMAIN=dev-3o1tehxthhxupbyz.us.auth0.com
AUTH0_CLIENT_ID=5HFFJeDRNvOnhSErxdF5uAXJaWj0Is5b
AUTH0_CLIENT_SECRET=bYcOY9w40NGpMz5wPW3fWSR5EoRIxgI5YufMmxeeK8vr7w0g8CPUzOf32PXzBgBT
AUTH0_AUDIENCE=https://guardian-agent.local/api

# OpenAI (for Vercel AI SDK agent)
OPENAI_API_KEY=sk-...

# Feature flags
USE_MOCK_TOKENS=false
```

---

## 8. Test Repo (for Demo)

Create a GitHub repo with a planted fake secret so Guardian has something to detect:

```bash
# Create test repo
gh repo create guardian-test-repo --public --clone
cd guardian-test-repo

# Plant fake secret
cat > config.js << 'EOF'
// Application configuration
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
const DATABASE_URL = "postgres://localhost:5432/app"
EOF

git add . && git commit -m "Add app config" && git push
```

---

## 9. Verification Checklist

Run through this after setup:

- [ ] `pnpm dev` starts without Auth0 errors
- [ ] Navigate to `http://localhost:3000` → see landing page
- [ ] Click "Sign in with Auth0" → redirected to Auth0 Universal Login
- [ ] Log in → redirected to `/dashboard`
- [ ] Navigate to Connections → see GitHub and Google cards
- [ ] Connect GitHub → OAuth consent → returns to connections page with "Read-Only" badge
- [ ] Click "Scan Now" → findings appear (if `USE_MOCK_TOKENS=false`, uses real GitHub API)
- [ ] Click "Request Protective Action" → step-up modal appears
- [ ] Approve step-up → remediation executes → badge returns to "Read-Only"
- [ ] Navigate to Audit → full chain visible: detected → approved → executed → expired
- [ ] Token Vault exchange returns real GitHub access token (check server logs)
- [ ] CIBA flow triggers user notification (if configured)

---

## Troubleshooting

### "Token Vault not enabled"
Request access at community.auth0.com. Until granted, set `USE_MOCK_TOKENS=true` in `.env.local`.

### "Connection not found" on token exchange
Ensure the social connection (GitHub/Google) has Token Vault enabled under Advanced settings, and is enabled for the Guardian Agent application.

### "Invalid grant" on CIBA
Ensure CIBA is enabled on the tenant and the application has the `urn:openid:params:grant-type:ciba` grant type enabled.

### Refresh token missing from session
Ensure `offline_access` is in the authorization scopes (already configured in `src/lib/auth0.ts`). Also verify Refresh Token Rotation is enabled on the application.

### GitHub scopes too narrow
If the scanner can't read repo contents, check that `repo` scope is enabled on the GitHub social connection. The `repo` scope grants read access to private repos.
