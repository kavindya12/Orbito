# Deploy Orbito API on Render (Free)

This guide deploys the **backend only** (`apps/api`) on Render’s free plan, with free PostgreSQL.  
The frontend stays on **Vercel**.

Config used by this repo: [`render.yaml`](../render.yaml) (at repo root).

---

## What you get

| Resource | Name | Plan |
|----------|------|------|
| Web service | `orbito-api` | Free |
| Database | `orbito-db` (PostgreSQL) | Free |

Local still uses **SQLite**. On Render, the Blueprint build switches Prisma to **PostgreSQL** automatically.

---

## Before you start

1. A [Render](https://render.com) account (GitHub login is easiest)
2. This repo on GitHub: `kavindya12/Orbito` (on `main`)
3. Your Vercel frontend URL, e.g. `https://orbito.vercel.app`  
   (You can finish Render first and add CORS after Vercel exists.)

---

## Step 1 — Create from Blueprint

1. Open [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect the **kavindya12/Orbito** repository
4. Branch: **main**
5. Render reads `render.yaml` and shows:
   - `orbito-api` (Web Service)
   - `orbito-db` (PostgreSQL)
6. Click **Apply**

Wait until the first deploy finishes (often 5–15 minutes on free).

---

## Step 2 — Set required environment variables

Open **orbito-api** → **Environment**.

These are already set by the Blueprint:

| Key | Source |
|-----|--------|
| `DATABASE_URL` | From `orbito-db` |
| `JWT_ACCESS_SECRET` | Auto-generated |
| `JWT_REFRESH_SECRET` | Auto-generated |
| `JWT_ACCESS_EXPIRES` | `2h` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `NODE_VERSION` | `20` |

**You must set** (replace with your real Vercel URL):

| Key | Example value |
|-----|----------------|
| `CLIENT_URL` | `https://YOUR-APP.vercel.app` |
| `CORS_ORIGIN` | `https://YOUR-APP.vercel.app` |

If you also have a staging domain:

```env
CORS_ORIGIN=https://YOUR-APP.vercel.app,https://YOUR-APP-git-main-xxx.vercel.app
```

Optional (leave empty if unused):

| Key | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | AI features |
| `CLOUDINARY_CLOUD_NAME` | Uploads |
| `CLOUDINARY_API_KEY` | Uploads |
| `CLOUDINARY_API_SECRET` | Uploads |

Save → Render will redeploy.

---

## Step 3 — Confirm the API is live

1. Open **orbito-api** → copy the service URL  
   Example: `https://orbito-api-xxxx.onrender.com`
2. Visit:

```text
https://orbito-api-xxxx.onrender.com/api/health
```

Expected response:

```json
{ "ok": true, "service": "orbito-api" }
```

If the first load is slow (20–60s), that is normal on the **free** plan (cold start after idle).

---

## Step 4 — Seed demo accounts (optional)

1. Open **orbito-api** → **Shell**
2. Run:

```bash
npm run db:seed -w @orbito/api
```

Demo logins after seed:

| Email | Password |
|-------|----------|
| `kavindya@orbito.dev` | `password123` |
| `john@orbito.dev` | `password123` |
| `sarah@orbito.dev` | `password123` |

---

## Step 5 — Point Vercel at Render

In the **Vercel** project → **Settings** → **Environment Variables**  
(Production and Staging):

```env
VITE_API_URL=https://orbito-api-xxxx.onrender.com/api
VITE_SOCKET_URL=https://orbito-api-xxxx.onrender.com
```

Rules:

- `VITE_API_URL` **must** end with `/api`
- `VITE_SOCKET_URL` is the API origin **without** `/api`
- No trailing slash on `VITE_SOCKET_URL`

Then **Redeploy** the Vercel project.

Also make sure Render `CORS_ORIGIN` / `CLIENT_URL` match that same Vercel URL.

---

## Manual setup (without Blueprint)

If Blueprint is unavailable, create resources by hand:

### A. PostgreSQL

1. **New +** → **PostgreSQL**
2. Name: `orbito-db`
3. Plan: **Free**
4. Create → copy the **Internal Database URL** (or External if needed)

### B. Web Service

1. **New +** → **Web Service**
2. Connect `kavindya12/Orbito`
3. Settings:

| Field | Value |
|-------|--------|
| Name | `orbito-api` |
| Region | Oregon (or closest) |
| Root Directory | *(leave empty)* |
| Runtime | Node |
| Build Command | see below |
| Start Command | `npm run start -w @orbito/api` |
| Instance type | Free |

**Build Command** (one line):

```bash
npm install --legacy-peer-deps && npm run build -w @orbito/shared && node -e "const fs=require('fs');const p='apps/api/prisma/schema.prisma';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('provider = \"sqlite\"','provider = \"postgresql\"'))" && npm run build -w @orbito/api && npm run db:push -w @orbito/api
```

**Health Check Path:** `/api/health`

**Environment** — same table as Step 2, plus paste `DATABASE_URL` from the Postgres instance.

---

## Free-plan limits (important)

| Topic | What to expect |
|-------|----------------|
| **Cold starts** | Service sleeps after ~15 min idle; first request can take 30–60s |
| **Compute** | Limited hours/month on free web services |
| **Postgres** | Free DB may expire after a period; export data if you need to keep it |
| **Uploads** | Local disk is ephemeral; use Cloudinary for real file storage |

For demos: open the health URL once before sharing the app, so the API is awake.

---

## Troubleshooting

### Health check fails / deploy error on `db:push`

- Confirm `DATABASE_URL` is linked from `orbito-db`
- Open deploy logs for Prisma errors
- Redeploy after fixing env

### Browser: “Cannot reach API” / CORS error

- `CORS_ORIGIN` must exactly match the Vercel URL (including `https://`)
- No trailing slash in origins
- Redeploy API after changing CORS

### Vercel builds but login fails

- Check `VITE_API_URL` ends with `/api`
- Redeploy **frontend** after changing `VITE_*` (they are baked in at build time)
- Hit `/api/health` on Render to wake the free instance

### `tsx` / build missing packages

- Use the build command from this doc (installs from monorepo root)
- Do **not** set Root Directory to `apps/api` alone without adjusting commands

---

## Quick checklist

- [ ] Blueprint applied (`orbito-api` + `orbito-db`)
- [ ] `CLIENT_URL` and `CORS_ORIGIN` set to Vercel URL
- [ ] `/api/health` returns `{ "ok": true }`
- [ ] (Optional) DB seeded
- [ ] Vercel `VITE_API_URL` + `VITE_SOCKET_URL` set
- [ ] Vercel redeployed
- [ ] Login works on the live site

---

## Related docs

- Repo overview: [README.md](../README.md)
- Env reference: [.env.example](../.env.example)
- Blueprint file: [render.yaml](../render.yaml)
