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

## 3. Important: login will not work on GitHub Pages alone

**405 / login errors** happen because Pages is static HTML/JS only. It cannot accept `POST /api/auth/login`.

| Site | Login works? |
|------|----------------|
| https://kavindya12.github.io/Orbito/ | UI only — no |
| http://localhost:5173 with API running | Yes |

For a full working app:

```bash
npm run dev:api
npm run dev:web
```

Open http://localhost:5173 or http://localhost:5174  
Demo: `kavindya@orbito.dev` / `password123`

