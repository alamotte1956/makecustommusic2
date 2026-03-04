# Vercel Deployment Guide — Make Custom Music

This guide walks you through deploying the Make Custom Music application to Vercel. The project is configured as a hybrid app: Vite builds the React frontend as static assets, and the Express server runs as a Vercel Serverless Function.

---

## Prerequisites

Before deploying, ensure you have the following ready:

1. A [Vercel account](https://vercel.com/signup) (free tier works for testing).
2. The [Vercel CLI](https://vercel.com/docs/cli) installed (`npm i -g vercel`), or use the Vercel Dashboard for Git-based deploys.
3. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket).
4. Access to all required external service credentials (see Environment Variables below).

---

## Architecture Overview

| Layer | Technology | Vercel Mapping |
|-------|-----------|----------------|
| Frontend | React 19 + Vite + Tailwind 4 | Static files in `dist/public` |
| API Server | Express 4 + tRPC 11 | Serverless Function at `api/index.ts` |
| Database | MySQL/TiDB | External connection via `DATABASE_URL` |
| File Storage | AWS S3 | External connection via S3 env vars |
| Auth | Manus OAuth | External OAuth provider |
| Payments | Stripe | External via Stripe API keys |

The `vercel.json` configuration handles routing: API requests (`/api/*`), sitemap, and shared song pages are proxied to the serverless function, while all other requests are served from the static build output.

---

## Step 1: Import Project in Vercel

**Option A — Vercel Dashboard (recommended):**

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your Git repository.
3. Vercel will auto-detect the `vercel.json` configuration.
4. Configure environment variables (see Step 2).
5. Click **Deploy**.

**Option B — Vercel CLI:**

```bash
cd ai-music-generator
vercel
```

Follow the prompts to link the project. Then deploy with:

```bash
vercel --prod
```

---

## Step 2: Configure Environment Variables

Navigate to your Vercel project **Settings > Environment Variables** and add each of the following. All variables are required unless marked optional.

### Core Application

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:4000/dbname?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | Secret key for signing session cookies | A random 64-character hex string |
| `NODE_ENV` | Environment mode | `production` |

### Manus OAuth

| Variable | Description |
|----------|-------------|
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID` | Owner's Manus Open ID |
| `OWNER_NAME` | Owner's display name |

### AI / LLM Services

| Variable | Description |
|----------|-------------|
| `BUILT_IN_FORGE_API_URL` | Manus built-in API URL (server-side) |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for Manus built-in APIs (server-side) |
| `VITE_FRONTEND_FORGE_API_URL` | Manus built-in API URL (frontend) |
| `VITE_FRONTEND_FORGE_API_KEY` | Bearer token for frontend Manus APIs |
| `SUNO_API_KEY` | Suno AI music generation API key |
| `ELEVENLABS_API_KEY` | ElevenLabs text-to-speech API key |

### Stripe Payments

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (starts with `pk_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (starts with `whsec_`) |

### S3 File Storage

Your S3 credentials are typically embedded in the `BUILT_IN_FORGE_API_URL` configuration. If you are using a standalone S3 bucket, add:

| Variable | Description |
|----------|-------------|
| `S3_BUCKET` | S3 bucket name |
| `S3_REGION` | S3 region (e.g., `us-east-1`) |
| `S3_ACCESS_KEY_ID` | AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | AWS secret access key |

### Analytics (optional)

| Variable | Description |
|----------|-------------|
| `VITE_ANALYTICS_ENDPOINT` | Analytics endpoint URL |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID |

> **Tip:** Variables prefixed with `VITE_` are exposed to the frontend at build time. All others are server-side only.

---

## Step 3: Configure Stripe Webhook

After your first deployment, you need to update your Stripe webhook endpoint:

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks).
2. Add a new endpoint: `https://your-vercel-domain.vercel.app/api/stripe/webhook`.
3. Select the events: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables.
5. Redeploy for the change to take effect.

---

## Step 4: Configure Custom Domain (optional)

1. In Vercel Dashboard, go to **Settings > Domains**.
2. Add your custom domain (e.g., `makecustommusic.com`).
3. Follow Vercel's DNS configuration instructions.
4. The www-to-non-www redirect is handled by the Express middleware automatically.

---

## Step 5: Database SSL

Ensure your `DATABASE_URL` includes SSL parameters for production:

```
mysql://user:pass@host:4000/dbname?ssl={"rejectUnauthorized":true}
```

TiDB Serverless and most managed MySQL providers require SSL in production.

---

## Build & Output Structure

The `build:vercel` script runs `vite build`, which outputs the React frontend to `dist/public`. Vercel serves these as static files. The `api/index.ts` serverless function handles all API routes, OAuth callbacks, and dynamic content (sitemap, OG tags).

```
dist/public/          ← Static frontend (served by Vercel CDN)
  ├── assets/         ← Hashed JS/CSS bundles
  ├── index.html      ← SPA entry point
  ├── sw.js           ← Service worker
  └── robots.txt      ← SEO robots file
api/index.ts          ← Serverless function (Express app)
```

---

## Troubleshooting

**Cold starts:** Serverless functions have cold start latency (~1-3s). The first request after idle may be slow. Consider Vercel Pro for reduced cold starts.

**Function timeout:** The default timeout is 60 seconds (configured in `vercel.json`). Music generation API calls that take longer may need the timeout increased (requires Vercel Pro for >60s).

**Body size limit:** Vercel serverless functions have a 4.5MB request body limit. File uploads larger than this should go directly to S3 using presigned URLs.

**Environment variables not working:** Ensure `VITE_*` variables are set before build time (not just at runtime). Redeploy after changing any `VITE_*` variable.

**Database connection issues:** Vercel serverless functions create a new database connection per invocation. If you hit connection limits, consider using a connection pooler (e.g., PlanetScale, TiDB Serverless built-in pooling).

---

## Important Caveats

1. **Manus OAuth:** The OAuth flow relies on Manus infrastructure. Ensure the OAuth callback URL (`https://your-domain/api/oauth/callback`) is registered with Manus.

2. **File Storage:** The S3 helpers in `server/storage.ts` use Manus-provided credentials. You may need to configure your own S3 bucket and update the storage helpers if deploying outside Manus.

3. **LLM Integration:** The `invokeLLM` helper uses Manus Forge API. If deploying independently, you'll need to replace this with direct OpenAI/Anthropic API calls.

4. **Notification API:** The `notifyOwner` helper uses Manus notification infrastructure and will not work outside the Manus platform.

5. **This is a hybrid deployment** — the Manus-hosted version remains the primary deployment with full platform integration. The Vercel deployment is an alternative that requires manual configuration of all external services.
