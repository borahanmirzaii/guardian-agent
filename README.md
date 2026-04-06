# Guardian Agent

AI security copilot with progressive authorization. Monitors connected accounts (GitHub, Google) with read-only Token Vault scopes, detects security threats, and requests step-up auth via CIBA to take protective action.

**Core principle: read-only by default, write-only with step-up approval.**

## Architecture

```
User ──► Auth0 Login ──► Dashboard
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          GitHub          Google       Guardian
        Token Vault     Token Vault     Agent
        (read-only)     (read-only)    (AI + tools)
              │             │             │
              ▼             ▼             ▼
         Scan repos    Scan Gmail    Reason about
        for secrets   for forwarding   findings
              │             │             │
              └─────────────┴─────────────┘
                            │
                     Threat Detected?
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
              No threats        Step-Up Auth
              (all clear)     (CIBA → 60s write)
                                    │
                                    ▼
                            Execute Remediation
                            (create issue / remove
                             forwarding rule)
                                    │
                                    ▼
                            Token Expires → Read-Only
```

## Features

- **AI Agent** — Chat with Guardian to scan, analyze, and remediate security threats
- **GitHub Secret Scanning** — Detects AWS keys, API tokens, passwords, private keys in your repos
- **Gmail Forwarding Detection** — Finds suspicious email forwarding rules
- **Step-Up Authorization** — CIBA-based elevation from read-only to write (60s TTL)
- **Audit Trail** — Complete chain: detected → approved → executed → token expired
- **Risk Scoring** — Dashboard with severity-weighted security score

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript strict mode
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Auth0 (`@auth0/nextjs-auth0`, `@auth0/ai-vercel`)
- **AI**: Vercel AI SDK v6, OpenAI GPT-4o
- **Database**: SQLite via better-sqlite3
- **Deploy**: Railway

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Auth0 + OpenAI credentials

# Set up Auth0 tenant (detailed guide)
# See AUTH0-SETUP.md

# Run dev server
pnpm dev
# Open http://localhost:3001
```

## Demo Flow

1. **Sign in** with Auth0
2. **Connect** GitHub and Google accounts (read-only scopes)
3. **Open Agent** tab and ask: "Scan all my connected accounts"
4. **Review** findings on the Threats page
5. **Approve** step-up authorization to remediate a finding
6. **Verify** the audit trail shows the full chain

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

## Commands

```bash
pnpm dev          # Start dev server (port 3001)
pnpm build        # Production build
pnpm test         # Run unit tests (vitest, 16 tests)
pnpm test:e2e     # Run E2E tests (Playwright, 21 tests)
pnpm test:e2e:ui  # Run E2E tests with interactive UI
pnpm lint         # Lint code
```

## Live Demo

**Production**: https://guardian-agent-production.up.railway.app
