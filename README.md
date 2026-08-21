# Orbito

AI-powered collaborative project management.  
**Keep every project in orbit.**

Orbito helps teams plan work, track tasks on Kanban boards, collaborate in real time, and use AI to break down work, prioritize tasks, and check project health.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, Zustand |
| Backend | Node.js, Express, Prisma, JWT, Socket.IO |
| Shared | Zod schemas (`@orbito/shared`) |
| Database (local) | SQLite |
| Database (production) | PostgreSQL |

---

## Quick start

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
# API
copy .env.example apps\api\.env

# Frontend (create apps/web/.env with only these two lines)
# VITE_API_URL=http://localhost:4000/api
# VITE_SOCKET_URL=http://localhost:4000
```

On macOS/Linux use `cp` instead of `copy`. See [`.env.example`](.env.example) for every variable explained.

### 3. Set up the database

```bash
npm run build -w @orbito/shared
npm run db:push -w @orbito/api
npm run db:generate -w @orbito/api
npm run db:seed -w @orbito/api
```

### 4. Run the app

Open two terminals:

```bash
# Terminal 1 – API
npm run dev:api
```

```bash
# Terminal 2 – Web
npm run dev:web
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 (or 5174 if 5173 is busy) |
| API health | http://localhost:4000/api/health |

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| `kavindya@orbito.dev` | `password123` | Workspace owner |
| `john@orbito.dev` | `password123` | Member |
| `sarah@orbito.dev` | `password123` | Admin |
| `tester@orbito.dev` | `password123` | Member (My Tasks test user) |

After seeding, create the My Tasks tester (assigns 3 sample tasks):

```bash
npm run create:tester
npm run test:my-tasks
```

---

## What you can do

- **My Tasks** – Each member sees only work assigned to them
- **Auth & workspaces** – Register, log in, invite teammates
- **Projects & Kanban** – Create projects, drag tasks across columns
- **Collaboration** – Comments, mentions, file attachments, live notifications
- **Calendar & team** – Month/week/day views and member performance
- **Reports** – Charts for progress, workload, and completion
- **Search** – `Ctrl` / `Cmd` + `K` across tasks, projects, and people
- **AI Assistant** – Task breakdown, priority suggestions, project health (OpenAI or built-in fallback)
- **Themes** – Dark by default, light mode available in Settings

---

## Project structure

| Package | Path | Purpose |
|---------|------|---------|
| `@orbito/web` | `apps/web` | React frontend |
| `@orbito/api` | `apps/api` | Express API + Prisma |
| `@orbito/shared` | `packages/shared` | Shared Zod schemas & types |

---

## Environment variables

Full reference: [`.env.example`](.env.example).

| Area | Required? | Notes |
|------|-----------|--------|
| Database + JWT + CORS | Yes | Needed for local API |
| `VITE_API_URL` / `VITE_SOCKET_URL` | Yes | Needed for the frontend |
| Cloudinary | No | Falls back to local `/uploads` |
| OpenAI | No | Falls back to heuristic AI |

---

## Deploy

### Frontend (Vercel)

1. Import the `kavindya12/Orbito` repository
2. Leave **Root Directory** empty (repo root — do not set `apps/web`)
3. Framework preset: **Other** (configured in `vercel.json`)
4. Set:
   - `VITE_API_URL` → your live API URL ending with `/api`
   - `VITE_SOCKET_URL` → your live API origin

### Backend (API)

Deploy `apps/api` separately (Railway, Render, Fly.io, etc.) with a PostgreSQL `DATABASE_URL` and strong JWT secrets.
