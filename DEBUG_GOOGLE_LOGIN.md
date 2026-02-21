# Debug Guide: Google Login Not Working

## Common Issues and Fixes

### 1. Check Browser Console
Open browser DevTools (F12) and check Console tab for errors:
- Look for CORS errors
- Look for network errors
- Look for postMessage errors

### 2. Verify Environment Variables

**Backend `.env` file:**
```env
GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
FRONTEND_URL=http://localhost:3000
```

**Frontend `.env.local` file:**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
NEXT_PUBLIC_JOBSEEKER_URL=http://localhost:5001/jobseeker
```

### 3. Verify Redirect URI in Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

Make sure this EXACT URI is added:
```
http://localhost:3000/compress-pdf/callback
```

### 4. Check Network Tab

1. Open DevTools > Network tab
2. Try logging in
3. Look for:
   - `/compress-pdf/callback` request
   - `/api/user/google-oauth-callback` request
   - Check if responses are successful

### 5. Check localStorage

After login attempt, check:
```javascript
localStorage.getItem('pdf_token')
localStorage.getItem('pdf_user')
```

If these are null, login didn't complete.

### 6. Check Backend Logs

Check backend console for errors:
- "Google OAuth credentials not configured"
- Token exchange errors
- User info fetch errors

### 7. Test Backend Endpoint Directly

Test if backend is working:
```bash
curl -X POST http://localhost:5001/api/user/google-oauth-callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirectUri":"http://localhost:3000/compress-pdf/callback"}'
```

Should return an error about invalid code (which is expected, but means endpoint is working).

### 8. Verify Popup is Not Blocked

- Check if popup blocker is enabled
- Allow popups for localhost:3000

### 9. Check CORS Settings

Backend should allow:
```javascript
origin: ['http://localhost:3000']
credentials: true
```

### 10. Common Error Messages

| Error | Solution |
|-------|----------|
| `redirect_uri_mismatch` | Add exact redirect URI to Google Console |
| `invalid_client` | Check client ID and secret are correct |
| `invalid_grant` | Code expired or already used - try again |
| `Popup blocked` | Allow popups for the site |
| `Failed to complete Google login` | Check backend logs for details |

## Debug Steps

1. **Open Console**: F12 > Console tab
2. **Try Login**: Click "Continue with Google"
3. **Watch Console**: Look for logged messages
4. **Check Network**: See if requests are failing
5. **Check Storage**: Verify localStorage has token after login

## Expected Flow

1. User clicks "Continue with Google"
2. Popup opens with Google login
3. User signs in
4. Google redirects to `/compress-pdf/callback?code=...`
5. Callback page sends code to backend
6. Backend exchanges code for token
7. Backend gets user info from Google
8. Backend returns JWT token
9. Callback page stores token in localStorage
10. Callback page sends postMessage to parent
11. Parent receives message and closes modal
12. User is redirected to `/compress-pdf`

## If Still Not Working

1. Check all console errors
2. Verify all environment variables are set
3. Restart both frontend and backend servers
4. Clear browser cache and cookies
5. Try in incognito/private window
6. Check backend is running on correct port
7. Verify frontend is using correct backend URL

