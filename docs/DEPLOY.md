# HeatLedger AI — Production Deployment Guide

A step-by-step guide for deploying HeatLedger AI to production with high security and minimal monthly operating cost.

**Target Monthly Budget (Pilot Stage):** Under ₹3,000 / month (~$35 USD) + variable Gemini AI token usage.

| Component | Platform | Plan / Tier | Est. Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | Cloudflare Pages | Free Tier (unlimited bandwidth) | ₹0 / mo |
| **API Container** | Render / Railway / Fly.io | 1 vCPU, 512 MB persistent web service | ~₹580 / mo ($7) |
| **PostgreSQL Database** | Supabase Postgres | Free / Micro tier with RLS | ₹0 – ₹2,100 / mo |
| **Document Storage** | Supabase Storage / Cloudflare R2 | Private S3-compatible bucket | ₹0 – ₹400 / mo |
| **Total** | | | **< ₹3,000 / month** |

---

## 1. Database Setup (Supabase Postgres)

1. **Create Project**:
   - Go to [supabase.com](https://supabase.com) and click **New project**.
   - Set Name to `heatledger-production`, choose region `AWS Mumbai (ap-south-1)` for lowest latency from Indian mills.
   - Save your database password securely.
2. **Retrieve Connection String**:
   - Navigate to **Project Settings** → **Database**.
   - Under *Connection string*, select **URI** (Mode: Transaction pooler, port 6543, or direct port 5432).
   - Format: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
3. **Execute Schema**:
   - Open Supabase **SQL Editor**. Run `backend/db/schema.sql` (or let the app auto-migrate on first boot).

> *Screenshot description: The Supabase dashboard shows a green 'Active' badge with region 'Mumbai (ap-south-1)'. The connection URI panel displays the pooler connection string with a copy icon.*

---

## 2. API Container Deployment (Render / Railway / Fly.io)

1. **Connect Repository**:
   - Go to [render.com](https://render.com) (or Railway) → **New Web Service** → Connect your GitHub repo (`HeatLedger-AI`).
2. **Service Configuration**:
   - **Environment**: `Docker` (Render automatically detects the root `Dockerfile`).
   - **Instance Type**: `Starter` ($7/mo, 512 MB RAM, 1 CPU).
   - **Health Check Path**: `/healthz`
3. **Set Environment Variables**:
   Add the following in the Render Environment tab:
   - `ENV`: `production`
   - `DATABASE_URL`: Your Supabase connection string from Step 1.
   - `JWT_SECRET`: 64-character random hex string (`openssl rand -hex 32`).
   - `URL_SIGNING_SECRET`: 64-character random hex string.
   - `ENCRYPTION_KEY`: 32-character random string.
   - `ALLOWED_ORIGINS`: `https://app.heatledger.ai,https://heatledger.ai`
   - `RAZORPAY_KEY_ID`: `rzp_live_...`
   - `RAZORPAY_KEY_SECRET`: Your Razorpay live secret.
   - `RAZORPAY_WEBHOOK_SECRET`: Your Razorpay webhook secret.
   - `RESEND_API_KEY`: `re_...`
   - `SENTRY_DSN`: Your Sentry project DSN.
   - `GEMINI_API_KEY`: Google AI Studio API key.
   - `DEMO_MODE`: `false`
4. **Deploy**:
   - Click **Create Web Service**. Build takes ~2 minutes. Render executes `gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app`.

> *Screenshot description: Render dashboard logs show: `[STARTUP] Configuration loaded via pydantic-settings. Environment: production. Listening on 0.0.0.0:8000`. The service status displays a green 'Live' badge.*

---

## 3. Frontend Deployment (Cloudflare Pages)

1. **Create Pages Project**:
   - Log into [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → Connect GitHub.
   - Select `HeatLedger-AI` repository and branch `main`.
2. **Build Settings**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. **Environment Variables**:
   - `VITE_API_URL`: `https://api.heatledger.ai`
   - `VITE_BRAND_NAME`: `HeatLedger AI`
4. **Deploy**:
   - Click **Save and Deploy**. Cloudflare builds the React bundle and applies `public/_headers` (SPA security headers + immutable asset caching) and `public/_redirects` (www to apex 301 + `/* /index.html 200` SPA fallback).

> *Screenshot description: Cloudflare Pages displays 'Success: Deployment complete' with a live preview thumbnail of the Indian steel exporter login screen.*

---

## 4. Custom Domains & SSL Setup

1. **DNS Records (Cloudflare DNS)**:
   - Apex domain (`heatledger.ai`): CNAME to Cloudflare Pages deployment.
   - Exporter App (`app.heatledger.ai`): CNAME to Cloudflare Pages deployment.
   - API Backend (`api.heatledger.ai`): CNAME to Render service hostname (`heatledger-api.onrender.com`).
2. **SSL / TLS**:
   - Set SSL mode to **Full (strict)** in Cloudflare dashboard.
   - Cloudflare provisions free automated Universal SSL certificates with HTTP/3 and 0-RTT support.

---

## 5. Verification Checklist

Run these quick curl checks to verify the live production cluster:

```bash
# 1. Check Liveness Probe (process running)
curl -i https://api.heatledger.ai/healthz
# Expected: HTTP 200 OK {"status":"alive",...}

# 2. Check Readiness Probe (database connected)
curl -i https://api.heatledger.ai/readyz
# Expected: HTTP 200 OK {"status":"HEALTHY","database":"CONNECTED",...}

# 3. Check Public Status Page
curl -i https://app.heatledger.ai/status
# Expected: HTTP 200 OK HTML with React Status Page

# 4. Check Security Headers
curl -I https://app.heatledger.ai/
# Expected: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security
```
