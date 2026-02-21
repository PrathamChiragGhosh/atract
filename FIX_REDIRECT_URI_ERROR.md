# Fix: redirect_uri_mismatch Error

## Problem
You're getting: `Error 400: redirect_uri_mismatch`

This means the redirect URI in Google Cloud Console doesn't match what your app is sending.

## Solution

### Step 1: Find Your Exact Redirect URI

The app uses: `{your-origin}/compress-pdf/callback`

**Check what your origin is:**
- If running locally: `http://localhost:3000/compress-pdf/callback`
- If using a different port: `http://localhost:YOUR_PORT/compress-pdf/callback`
- If in production: `https://yourdomain.com/compress-pdf/callback`

### Step 2: Add to Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click on your **OAuth 2.0 Client ID** (the one you created)
5. In the **Authorized redirect URIs** section, click **+ ADD URI**
6. Add **EXACTLY** this URI (replace with your actual origin):

   **For Local Development:**
   ```
   http://localhost:3000/compress-pdf/callback
   ```

   **For Production:**
   ```
   https://yourdomain.com/compress-pdf/callback
   ```

7. **IMPORTANT**: Make sure:
   - ✅ No trailing slash: `/compress-pdf/callback` (NOT `/compress-pdf/callback/`)
   - ✅ Correct protocol: `http://` for local, `https://` for production
   - ✅ Correct port: `:3000` (or whatever port you're using)
   - ✅ Exact path: `/compress-pdf/callback` (case-sensitive)

8. Click **SAVE**

### Step 3: Common Mistakes to Avoid

❌ **Wrong:**
```
http://localhost:3000/compress-pdf/callback/
http://localhost/compress-pdf/callback
https://localhost:3000/compress-pdf/callback
http://127.0.0.1:3000/compress-pdf/callback
```

✅ **Correct:**
```
http://localhost:3000/compress-pdf/callback
```

### Step 4: Verify Your Current Setup

**Check what redirect URI your app is actually using:**

1. Open browser console (F12)
2. Go to your app's home page
3. Click on the PDF Compressor banner
4. Click "Continue with Google"
5. Before the error appears, check the URL in the popup window
6. Look for `redirect_uri=` in the URL - that's what you need to add to Google Console

**Example URL you might see:**
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcompress-pdf%2Fcallback&...
```

The `redirect_uri` parameter (URL decoded) is: `http://localhost:3000/compress-pdf/callback`

### Step 5: Multiple Environments

If you're testing on different ports or domains, add **ALL** of them:

```
http://localhost:3000/compress-pdf/callback
http://localhost:3001/compress-pdf/callback
https://staging.yourdomain.com/compress-pdf/callback
https://yourdomain.com/compress-pdf/callback
```

### Step 6: Wait and Retry

After saving in Google Console:
- Wait 1-2 minutes for changes to propagate
- Clear your browser cache
- Try logging in again

### Step 7: Still Not Working?

**Check the exact error in browser console:**

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try logging in again
4. Look for the OAuth request
5. Check the error response - it will show what redirect_uri was sent vs what was expected

**Or check the callback page:**
- The error might show in the URL: `?error=redirect_uri_mismatch&error_description=...`

## Quick Checklist

- [ ] Added redirect URI to Google Cloud Console
- [ ] URI matches exactly (no trailing slash, correct protocol, correct port)
- [ ] Saved changes in Google Console
- [ ] Waited 1-2 minutes for propagation
- [ ] Cleared browser cache
- [ ] Restarted frontend server (if needed)

## Still Having Issues?

1. **Double-check the redirect URI in your code:**
   - File: `atract/frontend/src/components/pdfLoginModal/PdfLoginModal.jsx`
   - Line 45: `const redirectUri = \`${window.location.origin}/compress-pdf/callback\`;`
   - This means it uses whatever origin your app is running on

2. **Check your frontend URL:**
   - What URL are you accessing the app from?
   - That's what `window.location.origin` will be
   - Make sure that exact URL + `/compress-pdf/callback` is in Google Console

3. **Test with a simple redirect URI first:**
   - Try adding just: `http://localhost:3000/compress-pdf/callback`
   - Make sure it works before adding production URLs

