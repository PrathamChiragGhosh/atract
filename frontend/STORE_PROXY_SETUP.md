# Lovable Store + Atract Proxy Setup

When opening `/store` via the Atract Next.js app, the Lovable (Vite) Store is proxied from `http://localhost:8080`. To fix the **white screen** (assets not loading), the Lovable Store must be configured to run under the `/store` base path.

## Fix: Set Vite base in the Lovable project

**In the Lovable Store project** (the Vite + React app that runs on port 8080):

1. Open the Vite config:
   - `vite.config.ts` or `vite.config.js`

2. Set the `base` option so the app is mounted at `/store`:

   **If using TypeScript (`vite.config.ts`):**
   ```ts
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     base: '/store/',
     plugins: [react()],
     // ... rest of your config (server port, etc.)
   })
   ```

   **If using JavaScript (`vite.config.js`):**
   ```js
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     base: '/store/',
     plugins: [react()],
     // ... rest of your config
   })
   ```

3. **React Router (if used):** Ensure the router also uses the same base. For React Router v6:
   ```jsx
   <BrowserRouter basename="/store">
     {/* ... routes */}
   </BrowserRouter>
   ```
   Or use the `BASENAME` env / `createBrowserRouter({ basename: '/store' })` if your app uses that.

4. Restart the Lovable dev server (port 8080).

## Verification

- Atract: `npm run dev` (e.g. port 3000).
- Lovable Store: `npm run dev` on port 8080 with `base: '/store/'`.
- Open **http://localhost:3000/store** — the Lovable UI should load with no white screen; JS, CSS, and images should load under `/store/`.

## Why this is needed

Without `base: '/store/'`, Vite emits asset URLs like `/assets/index-xxx.js`. The browser requests them from the Atract origin as `/assets/...`, which Next.js does not proxy. With `base: '/store/'`, assets become `/store/assets/...`, which are proxied to `localhost:8080/store/assets/...` (Vite serves them correctly), so they load when using the Atract app at `/store`.
