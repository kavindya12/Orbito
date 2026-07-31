# Orbito

AI-powered collaborative project management. **Keep every project in orbit.**

## Stack

| Layer | Tech |
|-------|------|
| Web | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, Zustand, dnd-kit, Recharts, Framer Motion |
| API | Node.js, Express, Prisma, JWT, Socket.IO |
| Shared | Zod schemas (`@orbito/shared`) |
| DB (local) | SQLite (`apps/api/prisma/dev.db`) |
| DB (prod) | PostgreSQL (Neon) - set `DATABASE_URL` and `provider = "postgresql"` |

## Quick start

```bash
npm install --legacy-peer-deps
npm run build -w @orbito/shared
npm run db:push -w @orbito/api
npm run db:generate -w @orbito/api
npm run db:seed -w @orbito/api
```

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev:web
```

- App: http://localhost:5173 (or next free port, e.g. 5174)
- API: http://localhost:4000/api/health

**Demo login:** `kavindya@orbito.dev` / `password123`

Also seeded: `john@orbito.dev` / `sarah@orbito.dev` (same password).

## Features

- Auth (JWT + refresh cookies) and workspace setup
- Projects with customizable Kanban columns and dnd-kit drag-and-drop
- Tasks, comments, file attachments (Cloudinary or local `/uploads`)
- Real-time notifications via Socket.IO
- Calendar (month / week / day), team management, reports & charts
- Global search (`Ctrl/Cmd+K`)
- Orbito AI: task breakdown, priority recommendations, project health (OpenAI or heuristic fallback)
- Dark-first theme with light mode toggle

## Workspace packages

| Package | Path |
|---------|------|
| `@orbito/web` | `apps/web` |
| `@orbito/api` | `apps/api` |
| `@orbito/shared` | `packages/shared` |

## Environment

See [`.env.example`](.env.example). Dev defaults: `apps/api/.env`, `apps/web/.env`.

Optional: `OPENAI_API_KEY`, Cloudinary credentials.

## Deploy (Vercel)

This monorepo deploys the **web** app as a Vite SPA.

1. Import `kavindya12/Orbito` on Vercel
2. Keep **Root Directory** as the repo root (do not set `apps/web`)
3. Framework should be **Vite** (set by `vercel.json`)
4. Add env vars for the frontend:
   - `VITE_API_URL` = your API base URL ending in `/api` (e.g. `https://your-api.example.com/api`)
   - `VITE_SOCKET_URL` = your API origin (e.g. `https://your-api.example.com`)

The Express API (`apps/api`) is not deployed by this Vercel config - host it separately (Railway, Render, Fly, etc.).
