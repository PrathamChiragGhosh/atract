# Nginx Production Setup: Atract + Lovable Store (Hostinger)

This document describes how to serve **Atract** (Next.js) and **Lovable Store** (Vite) on the same domain using Nginx on Hostinger. The Store is available at `/store` and `/store/*` with no iframe and no changes to frontend routing.

---

## 1. Server-side setup: Run Lovable Store with PM2

The Lovable Store must run as a separate Node process on the same server and listen on port **8080**.

### 1.1 On the server (in the Lovable Store project directory)

```bash
# Build the Lovable Store for production
npm run build

# Start (or restart) with PM2 on port 8080
# "preview" runs the built app; adjust script name if your app uses "serve" or similar
pm2 start "npm run preview -- --port 8080" --name atract-store

# Optional: save PM2 process list so it survives reboot
pm2 save
pm2 startup
```

**If your Lovable app does not have a `preview` script**, use whichever command serves the `dist` folder on port 8080, for example:

```bash
# If using 'serve' (npm install -g serve):
pm2 start "serve -s dist -l 8080" --name atract-store

# Or if the package.json has a custom serve script:
pm2 start "npm run serve -- --port 8080" --name atract-store
```

Ensure:

- Lovable has `base: "/store/"` in `vite.config` and router `basename: "/store"`.
- The process listens on `127.0.0.1:8080` or `0.0.0.0:8080` (Nginx will proxy to `127.0.0.1:8080`).

---

## 2. Nginx configuration

Edit the existing Nginx server block for your domain (e.g. `atract.com`). The **Store location blocks must be defined before** the catch-all `location /` that serves the Next.js app.

### 2.1 Add Store proxy (exact `/store` and prefix `/store/`)

```nginx
# Exact /store → proxy to Lovable app root
location = /store {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# All /store/* → proxy to Lovable app (path after /store/ sent as-is)
location /store/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Order:** Place these two `location` blocks **above** the `location /` block that forwards to the Next.js app (e.g. `proxy_pass http://127.0.0.1:3000` or similar). More specific locations should come first.

### 2.2 Example server block (reference only)

```nginx
server {
    listen 443 ssl http2;
    server_name atract.com www.atract.com;

    # SSL configuration (certbot / Hostinger)
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Store: exact and prefix — BEFORE location /
    location = /store {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /store/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Atract Next.js (catch-all)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Adjust Next.js port (`3000`) and SSL paths to match your Hostinger setup.

---

## 3. Reload Nginx safely

After editing the Nginx config:

```bash
# Test configuration
sudo nginx -t

# If OK, reload (no downtime)
sudo nginx -s reload
```

If `nginx -t` reports errors, fix them before running `reload`.

---

## 4. Final verification

- **https://atract.com/** → Atract home (Next.js).
- **https://atract.com/store** → Lovable Store UI (no white screen).
- **https://atract.com/store/** → Same Store UI.
- **https://atract.com/store/products/...** → Store product and other routes work.
- **Assets** (JS, CSS, images) under `/store/` load correctly.
- **Payments** and checkout flows work as before; no changes to payment logic.

---

## Summary

| Path              | Handled by     | Backend           |
|-------------------|----------------|-------------------|
| `/`               | Nginx `location /` | Next.js (e.g. :3000) |
| `/store`          | Nginx `location = /store` | Lovable :8080/   |
| `/store/*`        | Nginx `location /store/`  | Lovable :8080/*  |

- No Atract frontend changes; navbar continues to use `router.push("/store")`.
- No `/store` routes in Next.js; no iframe; Lovable remains a separate app.
- Nginx reverse proxy is the only integration layer for production.
