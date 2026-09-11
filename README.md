# Orbito

**AI-powered collaborative project management.**  
Keep every project in orbit.

Orbito helps teams plan work, track tasks on Kanban boards, collaborate in real time, and use AI to break down work, prioritize tasks, and check project health.

**Repo:** [github.com/kavindya12/Orbito](https://github.com/kavindya12/Orbito)

---

## Features

| Feature | What it does |
|---------|----------------|
| **My Tasks** | Personal view of everything assigned to you |
| **Workspaces** | Register, log in, invite teammates |
| **Projects & Kanban** | Create projects and drag tasks across columns |
| **Permissions** | Members can change task status; only the project owner can fully edit or delete |
| **Dashboard** | Active projects, deadlines, activity, and a **Productivity Trend** chart (last 14 days) |
| **Collaboration** | Comments, mentions, attachments, live notifications |
| **Calendar & team** | Month / week / day views and member performance |
| **Reports** | Progress, workload, and completion charts |
| **Search** | `Ctrl` / `Cmd` + `K` across tasks, projects, and people |
| **AI Assistant** | Task breakdown, priority tips, project health (OpenAI or built-in fallback) |
| **Themes** | Dark by default; light mode in Settings |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, Zustand, Recharts |
| Backend | Node.js, Express, Prisma, JWT, Socket.IO |
| Shared | Zod schemas (`@orbito/shared`) |
| Database (local) | SQLite |
| Database (production) | PostgreSQL (Render Blueprint) |

**Monorepo layout**

| Package | Path | Purpose |
|---------|------|---------|
| `@orbito/web` | `apps/web` | React frontend |
| `@orbito/api` | `apps/api` | Express API + Prisma |
| `@orbito/shared` | `packages/shared` | Shared Zod schemas & types |

---

## Quick start

**Requirements:** Node.js 20+

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
# Windows
copy .env.example apps\api\.env

# macOS / Linux
cp .env.example apps/api/.env
```

Create `apps/web/.env` with:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

See [`.env.example`](.env.example) for every variable (JWT, CORS, Cloudinary, OpenAI).

### 3. Set up the database

```bash
npm run build -w @orbito/shared
npm run db:push
npm run db:generate
npm run db:seed
```

### 4. Run the app

```bash
# Terminal 1 – API
npm run dev:api

# Terminal 2 – Web
npm run dev:web
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 (or **5174** if 5173 is busy) |
| API health | http://localhost:4000/api/health |

---

## Demo accounts

After `npm run db:seed`:

| Email | Password | Role |
|-------|----------|------|
| `kavindya@orbito.dev` | `password123` | Workspace owner |
| `john@orbito.dev` | `password123` | Member |
| `sarah@orbito.dev` | `password123` | Admin |

**My Tasks tester** (3 assigned sample tasks):

```bash
npm run create:tester
npm run test:my-tasks
```

| Email | Password |
|-------|----------|
| `tester@orbito.dev` | `password123` |

**Optional — fill Productivity Trend with demo completions:**

```bash
npm run backfill:productivity -w @orbito/api
```

---

## Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev:api` | Start API (watch mode) |
| `npm run dev:web` | Start Vite frontend |
| `npm run build:web` | Build shared + web (used by Vercel) |
| `npm run db:push` | Push Prisma schema to the DB |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed demo workspace, project, and users |
| `npm run create:tester` | Create `tester@orbito.dev` with assigned tasks |
| `npm run test:my-tasks` | Smoke-test My Tasks API |

---

## Environment variables

| Area | Required? | Notes |
|------|-----------|--------|
| `DATABASE_URL`, JWT secrets, `CORS_ORIGIN`, `PORT` | Yes | API (`apps/api/.env`) |
| `VITE_API_URL`, `VITE_SOCKET_URL` | Yes | Frontend (`apps/web/.env`) |
| Cloudinary | No | Falls back to local `apps/api/uploads` |
| OpenAI | No | Falls back to heuristic AI |

For local Vite on port **5174**, keep both origins in `CORS_ORIGIN`:

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

---

## Permissions (quick reference)

- **Project owner** — user who created the project (`ownerId`)
- **Members** — view the board and change task **status** (column / drag)
- **Owner only** — full task edit (assignee, priority, etc.), delete tasks, edit/delete the project

---

## Deploy

**Full free guide (one URL, no Vercel):** [docs/RENDER.md](docs/RENDER.md)

1. [render.com](https://render.com) → **New** → **Blueprint** → connect `kavindya12/Orbito`
2. Apply ([`render.yaml`](render.yaml) creates **orbito** + **orbito-db**)
3. Set `CLIENT_URL` and `CORS_ORIGIN` to your Render URL (e.g. `https://orbito-xxxx.onrender.com`)
4. Open that URL — website + API are on the same host
5. Optional seed: `npm run db:seed -w @orbito/api` in Render Shell

---

## License

Private / personal project unless otherwise stated.
