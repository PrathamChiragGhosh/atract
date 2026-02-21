# Localhost Setup for Google OAuth

This guide is for **localhost development only**. Server configuration will be done later.

## Current Configuration (Localhost)

### Backend Configuration
- **Backend URL**: `http://localhost:5001`
- **Frontend URL**: `http://localhost:3000`

### Google OAuth Setup for Localhost

1. **Google Cloud Console Setup:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find your OAuth 2.0 Client ID
   - Under **Authorized redirect URIs**, make sure you have:
     ```
     http://localhost:3000/compress-pdf/callback
     ```
   - Under **Authorized JavaScript origins**, make sure you have:
     ```
     http://localhost:3000
     ```

2. **Backend .env file** (`atract/backend/.env`):
   ```env
   GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   FRONTEND_URL=http://localhost:3000
   ```

3. **Frontend .env.local file** (`atract/frontend/.env.local`):
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
   NEXT_PUBLIC_JOBSEEKER_URL=http://localhost:5001/jobseeker
   ```

## Testing on Localhost

### Step 1: Start Backend
```bash
cd atract/backend
npm run dev
```

**Check logs for:**
```
✅ Google OAuth credentials loaded from .env
   Client ID: 731757029428-riti9k...
```

### Step 2: Start Frontend
```bash
cd atract/frontend
npm run dev
```

Frontend will run on: `http://localhost:3000`

### Step 3: Test Login Flow

1. Open browser: `http://localhost:3000`
2. Click on "Compress PDF" banner
3. Click "Continue with Google"
4. Google login popup should open
5. After login, should redirect to: `http://localhost:3000/compress-pdf`

## Verify Setup

### Check Backend Credentials:
```bash
cd atract/backend
node check-env.js
```

Should show:
```
✅ Google OAuth credentials are configured correctly!
```

### Check Frontend:
1. Open browser console (F12)
2. Type: `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`
3. Should show your client ID

## Current Redirect URI

The code automatically uses:
- **Redirect URI**: `http://localhost:3000/compress-pdf/callback`
- **Backend API**: `http://localhost:5001/api/user/google-oauth-callback`

## Troubleshooting Localhost Issues

### Issue: "redirect_uri_mismatch"
**Fix:** Make sure `http://localhost:3000/compress-pdf/callback` is added to Google Cloud Console

### Issue: "Google OAuth is not configured"
**Fix:** 
1. Check backend/.env has the credentials
2. Restart backend server
3. Run `node check-env.js` to verify

### Issue: Popup blocked
**Fix:** Allow popups for `http://localhost:3000`

### Issue: CORS error
**Fix:** Backend CORS is already configured for `http://localhost:3000`

## For Later: Server Configuration

When you're ready to deploy to production:

1. **Update Google Cloud Console:**
   - Add production redirect URI: `https://yourdomain.com/compress-pdf/callback`
   - Add production origin: `https://yourdomain.com`

2. **Update Backend .env (on server):**
   ```env
   FRONTEND_URL=https://yourdomain.com
   GOOGLE_CLIENT_ID=... (same or new)
   GOOGLE_CLIENT_SECRET=... (same or new)
   ```

3. **Update Frontend .env (on server):**
   ```env
   NEXT_PUBLIC_JOBSEEKER_URL=https://api.yourdomain.com/jobseeker
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
   ```

For now, everything is set up for **localhost only**.

