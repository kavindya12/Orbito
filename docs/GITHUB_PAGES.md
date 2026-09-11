# GitHub Pages for Orbito

Site: https://kavindya12.github.io/Orbito/

---

## 1. Enable Pages

1. Repo → **Settings** → **Pages**
2. **Source** → **GitHub Actions**
3. Save

Do **not** use “Deploy from a branch” with root — that only shows the README.

---

## 2. Wait for deploy

1. **Actions** → **Deploy GitHub Pages** → wait for green  
2. Open https://kavindya12.github.io/Orbito/

---

## 3. Login on GitHub Pages (demo mode)

GitHub Pages cannot run the real API. This site uses **demo mode**:

| Email | Password |
|-------|----------|
| `kavindya@orbito.dev` | `password123` |

You can browse dashboard, projects, and sample data. Changes are not saved to a real database.

---

## Full app on your PC (real API + SQLite)

```bash
npm run dev:api
npm run dev:web
```

Open http://localhost:5173 or http://localhost:5174
