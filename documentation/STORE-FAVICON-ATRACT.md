# Store Favicon: Use Atract Logo (Lovable App)

Use this guide in the **Lovable Store** project (Vite + React) so the Store tab shows the Atract favicon when opened at `/store`. No changes to Atract or Next.js; no routing or base path changes.

---

## 1. Get the Atract favicon

In the **Atract** repo, the favicon/icon used by the main app lives here:

| File | Path (from project root) |
|------|---------------------------|
| Favicon (ICO) | `frontend/src/app/favicon.ico` |
| Icon (PNG)    | `frontend/src/app/icon.png`   |
| Public icon   | `frontend/public/icon.png`    |

**Copy one file** (e.g. `favicon.ico` or `icon.png`) from Atract into the Lovable project. Prefer `favicon.ico` for best browser support; use `icon.png` if you only have PNG.

---

## 2. In the Lovable Store project

### 2.1 Add the favicon file

- Put the copied file in the Lovable app’s **public** folder.
- Name it so it’s clear it’s the Atract icon, e.g.:
  - `public/atract-favicon.ico`, or
  - `public/atract-favicon.png`

With Vite `base: "/store/"` (or `"/shop/"` when run standalone), files in `public/` are served at that base path (e.g. `/store/atract-favicon.ico` or `/shop/atract-favicon.ico`).

### 2.2 Update `index.html`

Open the Lovable app’s **`index.html`** (project root or sometimes inside `public/`). Find the existing favicon line, for example:

```html
<link rel="icon" href="/favicon.ico" />
```

Replace or add so the favicon points at the Atract asset under `/store/`:

**If you use ICO:**

```html
<link rel="icon" href="/store/atract-favicon.ico" />
```

**If you use PNG:**

```html
<link rel="icon" type="image/png" href="/store/atract-favicon.png" />
```

- Use **absolute path** `/store/atract-favicon.ico` (or `.png`) so it resolves correctly when the app is served at `https://yourdomain.com/store`.
- Do **not** change `base` in `vite.config`, router basename, or any app logic.

### 2.3 Rebuild

```bash
npm run build
```

Restart the dev server or the process that serves the built app (e.g. PM2) so the new `index.html` and `public/` assets are used.

---

## 3. Result

- Opening the Store at `/store` shows the Atract logo as the browser tab favicon.
- Atract and Store share the same brand icon.
- Routing, base path, proxy, and payments are unchanged.

---

## Summary

| Step | Where | Action |
|------|--------|--------|
| 1 | Atract repo | Copy `frontend/src/app/favicon.ico` or `frontend/src/app/icon.png` |
| 2 | Lovable repo | Paste into `public/` as e.g. `atract-favicon.ico` |
| 3 | Lovable repo | In `index.html`, set `<link rel="icon" href="./atract-favicon.ico" />` (relative so it works at /shop and /store) |
| 4 | Lovable repo | `npm run build` and restart the app |

No Next.js or Atract code is modified; only branding (favicon) is aligned in the Lovable app.
