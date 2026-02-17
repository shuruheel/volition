# Volition Setup and Deployment Guide

Complete guide to setting up Volition for local development and deploying to production on Vercel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Google Cloud OAuth Setup](#google-cloud-oauth-setup)
4. [Neon Postgres Setup](#neon-postgres-setup)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Running the Application](#running-the-application)
7. [Vercel Deployment](#vercel-deployment)
8. [Optional Integrations](#optional-integrations)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 20+** and **pnpm** package manager
- A **Google Cloud** project with OAuth 2.0 credentials
- A **Neon** Postgres database (free tier works)
- An **OpenAI** API key (or configure per-user in Settings UI)

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/shuruheel/volition.git
cd volition
pnpm install
```

### 2. Create environment file

```bash
cp env.example .env.local
```

### 3. Set required variables

At minimum, you need these in `.env.local`:

```bash
# Database (Neon Postgres)
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_SECRET=generate-with-openssl-rand-base64-32

# LLM (can also be configured per-user in the Settings UI)
OPENAI_API_KEY=sk-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run database migrations

```bash
pnpm db:setup
```

This creates all tables (users, agents, activities, memories, tool_configs, agent_schedules, etc.) across 14 migration files.

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the Google sign-in page.

---

## Google Cloud OAuth Setup

Volition uses Google OAuth for authentication AND for Gmail, Calendar, and Drive access. A single OAuth flow handles all of this.

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable these APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google Drive API**

### 2. Configure OAuth consent screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in:
   - App name: `Volition`
   - User support email: your email
   - Authorized domains: your domain (e.g., `your-app.vercel.app`)
   - Developer contact: your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/drive.file`
5. Add test users (while in testing mode, only these accounts can sign in)

### 3. Create OAuth credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `http://localhost:3000` (local dev)
   - `https://your-app.vercel.app` (production)
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
   - `http://localhost:3000/api/auth/google/callback` (legacy integration flow)
   - `https://your-app.vercel.app/api/auth/google/callback` (legacy integration flow)
6. Copy the **Client ID** and **Client Secret** to your `.env.local`

### 4. Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output to `AUTH_SECRET` in your `.env.local`.

---

## Neon Postgres Setup

### 1. Create a Neon project

1. Sign up at [neon.tech](https://neon.tech) (free tier available)
2. Create a new project
3. Copy the connection string from the dashboard

### 2. Configure connection strings

In `.env.local`:

```bash
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

Optionally, for connection pooling (recommended for production):

```bash
DATABASE_URL_POOLED=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
```

### 3. Run migrations

```bash
pnpm db:setup
```

Expected output:
```
Starting database setup...
Database connection is healthy
Running database migrations...
  Applied migration: 001_init.sql
  Applied migration: 002_add_activity_types.sql
  ...
  Applied migration: 014_agent_model.sql
Database setup complete!
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `AUTH_SECRET` | NextAuth.js session encryption key | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |

### Recommended

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Default OpenAI key (users can override in Settings) | `sk-...` |
| `APP_ENCRYPTION_KEY` | Encryption key for stored API keys (auto-generated in dev) | `openssl rand -hex 32` |
| `DATABASE_URL_POOLED` | Pooled Neon connection string | `...?pgbouncer=true` |

### Optional Integrations

| Variable | Description | Required For |
|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude models) | Anthropic LLM provider |
| `FIRECRAWL_API_KEY` | Firecrawl web search + scraping | Web research tool |
| `SUPERMEMORY_API_KEY` | Supermemory semantic memory | Long-term agent memory |
| `BROWSER_USE_API_KEY` | Browser-Use Cloud | Browser automation tool |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Voice calls |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Voice calls |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Voice calls |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Telegram messaging |

---

## Running the Application

### Development

```bash
pnpm dev
```

In development mode, the heartbeat scheduler runs locally via `setInterval` in `instrumentation.ts` (every 60 seconds).

### Production build

```bash
pnpm build
pnpm start
```

### Database commands

```bash
pnpm db:setup     # Run all pending migrations
pnpm db:migrate   # Alias for db:setup
pnpm db:reset     # Instructions to reset via Neon dashboard
```

---

## Vercel Deployment

### 1. Connect your repository

1. Go to [vercel.com](https://vercel.com) and import your Git repository
2. Vercel auto-detects the Next.js framework

### 2. Configure environment variables

In the Vercel dashboard, add all required environment variables:

- `DATABASE_URL`
- `DATABASE_URL_POOLED` (recommended)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (set to your Vercel URL, e.g., `https://your-app.vercel.app`)
- `OPENAI_API_KEY`
- `APP_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)

Add optional integration keys as needed.

### 3. Update Google OAuth redirect URIs

Add your Vercel deployment URL to the Google Cloud Console OAuth redirect URIs:
- `https://your-app.vercel.app/api/auth/callback/google`
- `https://your-app.vercel.app/api/auth/google/callback`

### 4. Deploy

Vercel automatically deploys on push. The `vercel.json` file configures:
- **Cron job**: Runs `/api/scheduler/tick` every minute for heartbeat scheduling
- The cron endpoint is protected and only processes overdue agent schedules

### 5. Run database migrations

After the first deploy, run migrations against your Neon database:

```bash
# Set DATABASE_URL in your local .env.local to point to your production Neon database
pnpm db:setup
```

Or run migrations from the Neon SQL editor by pasting the contents of each migration file in `db/migrations/` in order.

### 6. Verify deployment

1. Visit your Vercel URL
2. Sign in with Google
3. Complete onboarding (enter OpenAI API key)
4. Create an agent and start it
5. Check the activity feed for workflow execution

---

## Optional Integrations

### Firecrawl (Web Research)

1. Sign up at [firecrawl.dev](https://firecrawl.dev)
2. Get an API key
3. Add `FIRECRAWL_API_KEY` to environment
4. Enable "Firecrawl" tool when creating agents

### Supermemory (Semantic Memory)

1. Sign up at [supermemory.ai](https://supermemory.ai)
2. Get an API key
3. Add `SUPERMEMORY_API_KEY` to environment
4. Enable "Supermemory" tool when creating agents

### Browser-Use Cloud (Browser Automation)

1. Sign up at [browser-use.com](https://browser-use.com)
2. Get an API key
3. Add `BROWSER_USE_API_KEY` to environment
4. Enable "Browser-Use" tool when creating agents

### Twilio (Voice Calls)

1. Sign up at [twilio.com](https://twilio.com)
2. Get Account SID, Auth Token, and a phone number
3. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` to environment
4. Configure webhook URL: `https://your-app.vercel.app/api/twilio/voice`
5. Enable "Twilio" tool when creating agents

### Telegram Bot

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Get the bot token
3. Add `TELEGRAM_BOT_TOKEN` to environment
4. Set up webhook via `/api/telegram/setup`
5. Enable "Telegram" tool when creating agents

### Anthropic (Claude Models)

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Get an API key
3. Either add `ANTHROPIC_API_KEY` to environment OR configure per-user in Settings
4. When creating agents, select "Anthropic" provider and choose a Claude model

---

## Troubleshooting

### "DATABASE_URL is required" error

Make sure `DATABASE_URL` is set in `.env.local`. Volition requires a Neon Postgres database.

### Google sign-in redirects to error page

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that redirect URIs match exactly (including protocol and trailing slashes)
- Ensure the Google Cloud project has Gmail, Calendar, and Drive APIs enabled
- If in testing mode, make sure your Google account is listed as a test user

### Agent workflow doesn't start

- Check that the agent has an OpenAI API key configured (either via env var or in Settings)
- Check the Vercel function logs for errors
- Verify the agent status shows "active" after clicking Play

### Heartbeat scheduler not running

- **Production**: Verify `vercel.json` has the cron configuration and the deployment is on Vercel
- **Local dev**: The `instrumentation.ts` file runs a 60-second interval automatically
- Check `/api/scheduler/tick` endpoint manually: `curl -X POST http://localhost:3000/api/scheduler/tick`

### Encryption errors for tool configs

- In development, a deterministic dev key is auto-generated if `APP_ENCRYPTION_KEY` is not set
- In production, set `APP_ENCRYPTION_KEY` via `openssl rand -hex 32`
- If you change the encryption key, previously stored configs become unreadable and must be re-entered

### Build errors

```bash
pnpm build
```

Common issues:
- Missing environment variables at build time (especially `DATABASE_URL`)
- TypeScript errors are currently ignored via `typescript.ignoreBuildErrors: true` in `next.config.mjs`
