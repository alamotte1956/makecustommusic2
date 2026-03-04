# Railway Deployment Guide — Make Custom Music

This guide walks you through deploying the Make Custom Music application to [Railway](https://railway.app). Railway is well-suited for this project because it runs a persistent Node.js process (not serverless), which means the Express server operates exactly as designed — no architectural changes required.

---

## Prerequisites

Before deploying, ensure you have the following ready:

1. A [Railway account](https://railway.app/login) (free trial available; Hobby plan at $5/month recommended for production).
2. Your project pushed to a **GitHub repository**.
3. The [Railway CLI](https://docs.railway.app/guides/cli) installed (optional, for CLI-based deploys).
4. Access to all required external service credentials (see Environment Variables below).

---

## Architecture Overview

| Layer | Technology | Railway Mapping |
|-------|-----------|-----------------|
| Frontend | React 19 + Vite + Tailwind 4 | Built static files served by Express |
| API Server | Express 4 + tRPC 11 | Persistent Node.js service |
| Database | MySQL/TiDB | External database (or Railway MySQL plugin) |
| File Storage | AWS S3 | External connection via S3 env vars |
| Auth | Manus OAuth | External OAuth provider |
| Payments | Stripe | External via Stripe API keys |

Railway runs the full Express server as a long-lived process. The `build` script compiles both the Vite frontend and the esbuild server bundle, then `start` launches the production server which serves the static frontend and handles all API routes.

---

## Step 1: Create a Railway Project

**Option A — Railway Dashboard (recommended):**

1. Go to [railway.app/new](https://railway.app/new).
2. Select **Deploy from GitHub repo**.
3. Authorize Railway to access your GitHub account if not already connected.
4. Select the repository containing the Make Custom Music project.
5. Railway will auto-detect the Node.js project and configure build settings.

**Option B — Railway CLI:**

```bash
# Install the CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project from your repo directory
cd ai-music-generator
railway init

# Link to your GitHub repo
railway link
```

---

## Step 2: Configure Build & Start Commands

Railway should auto-detect these from `package.json`, but verify in **Settings > Build & Deploy**:

| Setting | Value |
|---------|-------|
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `pnpm start` |
| **Watch Paths** | `/` (default) |

The `build` command runs `vite build` (frontend) followed by `esbuild` (server bundle). The `start` command runs `NODE_ENV=production node dist/index.js`, which serves both the API and the static frontend on a single port.

> **Note:** Railway automatically assigns a `PORT` environment variable. The Express server already reads `process.env.PORT` and defaults to 3000, so no changes are needed.

---

## Step 3: Configure Environment Variables

Navigate to your Railway service **Variables** tab and add each of the following. All variables are required unless marked optional.

### Core Application

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:4000/dbname?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | Secret key for signing session cookies | A random 64-character hex string |
| `NODE_ENV` | Environment mode (set automatically by start script) | `production` |

> **Tip:** You can generate a secure JWT_SECRET by running `openssl rand -hex 32` in your terminal.

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

> **Important:** Variables prefixed with `VITE_` are embedded into the frontend at build time. After changing any `VITE_*` variable, you must trigger a redeploy for the change to take effect.

---

## Step 4: Deploy

**From the Dashboard:**

Once environment variables are configured, Railway will automatically deploy when you push to your default branch (usually `main`). You can also trigger a manual deploy from the **Deployments** tab.

**From the CLI:**

```bash
railway up
```

Monitor the deployment logs in the Railway Dashboard or via:

```bash
railway logs
```

You should see output like:

```
Server running on http://localhost:<PORT>/
```

---

## Step 5: Configure Custom Domain

1. In your Railway service, go to **Settings > Networking > Public Networking**.
2. Click **Generate Domain** to get a free `*.up.railway.app` subdomain.
3. To use a custom domain (e.g., `makecustommusic.com`):
   - Click **Add Custom Domain**.
   - Enter your domain name.
   - Railway will provide DNS records (CNAME) to configure with your domain registrar.
   - Wait for DNS propagation (typically 5-30 minutes).

The www-to-non-www redirect is handled automatically by the Express middleware.

---

## Step 6: Configure Stripe Webhook

After your first deployment, update your Stripe webhook endpoint:

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks).
2. Add a new endpoint: `https://your-railway-domain.up.railway.app/api/stripe/webhook` (or your custom domain).
3. Select the events: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Railway environment variables.
5. Railway will automatically redeploy with the new variable.

---

## Step 7: Database Setup

You have two options for the database:

**Option A — Use existing TiDB/MySQL database (recommended):**

Set the `DATABASE_URL` environment variable to your existing database connection string. Ensure SSL is enabled for production.

**Option B — Railway MySQL plugin:**

1. In your Railway project, click **New > Database > MySQL**.
2. Railway provisions a MySQL instance and provides connection variables.
3. Copy the `DATABASE_URL` from the MySQL service and add it to your app service variables.
4. Run the database migration: from the Railway CLI, execute:

```bash
railway run pnpm db:push
```

Or connect to the Railway shell and run:

```bash
pnpm db:push
```

---

## Railway-Specific Advantages

Railway offers several benefits over serverless platforms for this project:

**Persistent process.** The Express server runs continuously, eliminating cold starts. Music generation requests that take 10-30 seconds work without timeout concerns.

**WebSocket support.** If you add real-time features in the future, Railway supports WebSocket connections natively.

**No body size limits.** Unlike serverless platforms with 4.5MB limits, Railway handles large file uploads directly through Express.

**Simple scaling.** Railway supports horizontal scaling with multiple replicas if traffic grows, and vertical scaling by adjusting memory/CPU in service settings.

**Built-in logging.** View real-time logs in the Dashboard or via `railway logs --tail`.

---

## Monitoring & Health Checks

Railway automatically monitors your service. To add a custom health check:

1. Go to **Settings > Deploy > Healthcheck Path**.
2. Set it to `/api/trpc/auth.me` (or create a dedicated `/api/health` endpoint).
3. Railway will restart the service if the health check fails.

---

## Cost Estimation

| Plan | Price | Resources | Suitable For |
|------|-------|-----------|--------------|
| Trial | Free (one-time $5 credit) | 512 MB RAM, shared CPU | Testing only |
| Hobby | $5/month | 8 GB RAM, 8 vCPU | Low-traffic production |
| Pro | $20/month | 32 GB RAM, 32 vCPU | High-traffic production |

Typical usage for this app with moderate traffic falls within the Hobby plan limits.

---

## Troubleshooting

**Build fails with "out of memory":** Increase the build memory in **Settings > Build**. The Vite + esbuild pipeline typically needs 1-2 GB.

**`VITE_*` variables not working:** These are embedded at build time. After changing them, trigger a new deployment (push a commit or click Redeploy).

**Database connection refused:** Ensure your database allows connections from Railway's IP ranges. For TiDB Serverless, add `0.0.0.0/0` to the IP access list, or use Railway's static IP feature (Pro plan).

**Port binding errors:** Do not hardcode the port. The server already reads `process.env.PORT`, which Railway sets automatically.

**Deploy succeeds but site returns 502:** Check the deployment logs for startup errors. Common causes are missing environment variables or database connection failures.

---

## Important Caveats

1. **Manus OAuth:** The OAuth flow relies on Manus infrastructure. Ensure the OAuth callback URL (`https://your-railway-domain/api/oauth/callback`) is registered with Manus.

2. **File Storage:** The S3 helpers in `server/storage.ts` use Manus-provided credentials. You may need to configure your own S3 bucket and update the storage helpers if deploying outside Manus.

3. **LLM Integration:** The `invokeLLM` helper uses Manus Forge API. If deploying independently, you'll need to replace this with direct OpenAI/Anthropic API calls.

4. **Notification API:** The `notifyOwner` helper uses Manus notification infrastructure and will not work outside the Manus platform.

5. **This is an alternative deployment** — the Manus-hosted version remains the primary deployment with full platform integration. The Railway deployment requires manual configuration of all external services.

---

## Quick Reference Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize and link project
railway init
railway link

# Deploy
railway up

# View logs
railway logs --tail

# Run database migrations
railway run pnpm db:push

# Open the deployed app
railway open

# SSH into the running service
railway shell
```
