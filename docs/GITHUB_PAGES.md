# Fix GitHub Pages (show the app, not the README)

Right now `https://kavindya12.github.io/Orbito/` shows the **README** because Pages is publishing the repo root.

Orbito’s real UI is the Vite build in `apps/web/dist`. This repo includes a GitHub Action that builds and deploys that.

---

## 1. Turn on GitHub Pages (Actions)

1. Open repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. Save

Do **not** use “Deploy from a branch” with `/ (root)` — that is why you see the README.

---

## 2. Push / re-run the workflow

After this workflow is on `main`:

1. Repo → **Actions** → **Deploy GitHub Pages**
2. Wait until it is green
3. Open: https://kavindya12.github.io/Orbito/

You should see the Orbito **login / landing UI**, not the README.

---

## 3. Important limit

GitHub Pages is **frontend only**. It cannot run the Express API or the database.

| What works on Pages | What needs the local API |
|---------------------|---------------------------|
| UI / screens load | Login, projects, tasks, dashboard data |

For a full demo, run on your PC:

```bash
npm run dev:api
npm run dev:web
```

Open http://localhost:5173 or http://localhost:5174

If you later have a public API URL, add GitHub secrets and re-run the workflow:

| Secret | Example |
|--------|---------|
| `VITE_API_URL` | `https://your-api.example.com/api` |
| `VITE_SOCKET_URL` | `https://your-api.example.com` |
