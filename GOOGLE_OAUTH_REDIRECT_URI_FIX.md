# Fix: redirect_uri_mismatch Error

## Problem
Error: `Error 400: redirect_uri_mismatch`

This happens when the redirect URI in your code doesn't match what's configured in Google Cloud Console.

## Solution

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID (the one starting with `731757029428...`)

### Step 2: Add Redirect URI
Under **Authorized redirect URIs**, click **+ ADD URI** and add:

**For Development (localhost):**
```
http://localhost:3000/compress-pdf/callback
```

**For Production (if deployed):**
```
https://yourdomain.com/compress-pdf/callback
```

### Step 3: Important Notes
- ✅ **NO trailing slash** (`/compress-pdf/callback` NOT `/compress-pdf/callback/`)
- ✅ **Exact match required** - including `http://` or `https://`
- ✅ **Include port number** for localhost (`:3000`)
- ✅ Click **SAVE** after adding

### Step 4: Wait and Retry
- Changes may take a few minutes to propagate
- Try the login again after 1-2 minutes

## Current Redirect URI in Code
The code uses: `${window.location.origin}/compress-pdf/callback`

Which resolves to:
- **Development**: `http://localhost:3000/compress-pdf/callback`
- **Production**: `https://yourdomain.com/compress-pdf/callback`

Make sure **both** match exactly in Google Cloud Console!

## Verify Your Setup

### Backend `.env` (atract/backend/.env):
```env
GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local` (atract/frontend/.env.local):
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
NEXT_PUBLIC_JOBSEEKER_URL=http://localhost:5001/jobseeker
```

## Still Not Working?

1. **Clear browser cache** and cookies
2. **Check console logs** for exact redirect URI being used
3. **Verify port numbers** - make sure frontend is running on port 3000
4. **Double-check** - Copy the exact URI from Google Console and compare with code

