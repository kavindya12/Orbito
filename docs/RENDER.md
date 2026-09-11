# Host Orbito on Render (Free) — one website URL

You do **not** need Vercel. One free Render Web Service runs both the **website** and the **API**.

---

## What you get

| Resource | Name | Plan |
|----------|------|------|
| Web service | `orbito` | Free (site + API) |
| Database | `orbito-db` | Free PostgreSQL |

After deploy you open **one** link, like:

`https://orbito-xxxx.onrender.com`

Login works on that same link (no separate frontend host).

---

## Step 1 — Create with Blueprint

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in  
2. **New +** → **Blueprint**  
3. Connect GitHub repo **kavindya12/Orbito** (branch `main`)  
4. Click **Apply**

Wait for the first deploy (5–15 minutes on free).

---

## Step 2 — Environment variables

Open service **orbito** → **Environment**.

### Already set by Blueprint

- `DATABASE_URL` (from Postgres)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES` = `2h`
- `JWT_REFRESH_EXPIRES` = `7d`
- `NODE_VERSION` = `20`
- `SERVE_WEB` = `true`

### Set after you know your Render URL

When Render gives you a URL like `https://orbito-xxxx.onrender.com`:

| Key | Value |
|-----|--------|
| `CLIENT_URL` | `https://orbito-xxxx.onrender.com` |
| `CORS_ORIGIN` | `https://orbito-xxxx.onrender.com` |

Save → it will redeploy.

Optional (skip): `OPENAI_API_KEY`, Cloudinary keys.

---

## Step 3 — Manual create (if you skip Blueprint)

### A. PostgreSQL

- **New +** → **PostgreSQL** → name `orbito-db` → **Free**

### B. Web Service

| Field | Value |
|-------|--------|
| Name | `orbito` (lowercase) |
| Root Directory | *(leave empty)* |
| Runtime | **Node** (not Express) |
| Instance | **Free** |
| Build Command | *(paste below)* |
| Start Command | `npm run start -w @orbito/api` |
| Health Check Path | `/api/health` |

**Build Command** (one line):

```bash
npm install --legacy-peer-deps && npm run build -w @orbito/shared && node -e "const fs=require('fs');const p='apps/api/prisma/schema.prisma';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('provider = \"sqlite\"','provider = \"postgresql\"'))" && VITE_API_URL=/api npm run build -w @orbito/web && npm run build -w @orbito/api && npm run db:push -w @orbito/api
```

**Start Command:**

```bash
npm run start -w @orbito/api
```

Link `DATABASE_URL` from `orbito-db`, add JWT secrets, `SERVE_WEB=true`, then set `CLIENT_URL` / `CORS_ORIGIN` to your service URL.

---

## Step 4 — Check it works

1. Open `https://YOUR-SERVICE.onrender.com/api/health`  
   → `{ "ok": true, "serveWeb": true }`
2. Open `https://YOUR-SERVICE.onrender.com`  
   → Orbito login page
3. Optional seed (Render **Shell**):

```bash
npm run db:seed -w @orbito/api
```

Demo login: `kavindya@orbito.dev` / `password123`

---

## Free plan notes

- Service **sleeps** after idle; first open can take 30–60 seconds  
- Use **one** URL only — do not point Vercel at this unless you want a separate frontend  

---

## Local development (unchanged)

```bash
npm run dev:api
npm run dev:web
```

Local still uses SQLite + Vite on port 5173/5174.

---

## Common mistakes

| Wrong | Right |
|-------|--------|
| Root Directory = `apps/api` | Root Directory **empty** |
| Preset = Express + `yarn start` | Node + `npm run start -w @orbito/api` |
| Only building the API | Build command must also build the web app (`VITE_API_URL=/api`) |
| Expecting instant wake on free | Wait for cold start, then refresh |
