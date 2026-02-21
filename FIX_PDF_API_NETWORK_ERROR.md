# Fix: PDF API Network Error

## Problem
Getting `Network Error` when trying to access PDF compressor features:
- `/api/subscription/plans`
- `/api/subscription/stats`

## Solutions

### Solution 1: Check Backend is Running

**Make sure your backend server is running:**

```bash
cd atract/backend
npm start
# or
node server.js
```

You should see:
```
Server running on http://0.0.0.0:5001
```

**If backend is not running:**
- Start it on port 5001 (or whatever port is configured)
- Check your `.env` file for `PORT` variable

### Solution 2: Check API URL Configuration

The frontend needs to know where your backend is. Check your frontend `.env.local` file:

**File: `atract/frontend/.env.local`**

Add one of these (depending on what you have):

```bash
# Option 1: Direct API URL
NEXT_PUBLIC_API_URL=http://localhost:5001

# Option 2: Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001

# Option 3: Extract from JOBSEEKER_URL (if you have this)
NEXT_PUBLIC_JOBSEEKER_URL=http://localhost:5001/jobseeker
```

**After adding, restart your frontend:**
```bash
cd atract/frontend
# Stop server (Ctrl+C)
npm run dev
```

### Solution 3: Check CORS Configuration

The backend needs to allow requests from your frontend origin.

**File: `atract/backend/src/app.js`**

Make sure CORS includes your frontend URL:

```javascript
const corsOptions = {
    origin: [
        process.env.CORS_1,
        process.env.CORS_2,
        'http://localhost:3000', // Default frontend
        'http://localhost:3010', // If using port 3010
    ].filter(Boolean),
    credentials: true,
};
```

**Or add to backend `.env`:**
```bash
CORS_1=http://localhost:3000
CORS_2=http://localhost:3010
```

**After updating, restart backend:**
```bash
cd atract/backend
# Stop server (Ctrl+C)
npm start
```

### Solution 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for: `📡 PDF API Base URL: http://localhost:5001`
4. This shows what URL the frontend is trying to use

**If the URL is wrong:**
- Check your `.env.local` file
- Make sure environment variables are set correctly
- Restart frontend server

### Solution 5: Test Backend Directly

**Test if backend is accessible:**

Open in browser or use curl:
```bash
# Test if backend is running
curl http://localhost:5001/api/subscription/plans

# Should return JSON (even if error, means backend is reachable)
```

**If you get connection refused:**
- Backend is not running
- Backend is on different port
- Firewall is blocking

### Solution 6: Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try to access PDF compressor page
4. Look for failed requests
5. Check:
   - **Request URL**: Should be `http://localhost:5001/api/subscription/...`
   - **Status**: Should not be `(failed)` or `CORS error`
   - **Error message**: Will show specific issue

### Solution 7: Verify Routes are Registered

**Check backend routes are registered:**

File: `atract/backend/src/app.js` should have:
```javascript
app.use("/api/pdf", pdfRoutes);
app.use("/api/subscription", pdfSubscriptionRoutes);
app.use("/api/user", pdfUserRoutes);
```

### Solution 8: Check Port Mismatch

**If frontend is on port 3010 but backend expects 3000:**

The CORS configuration should include both:
```javascript
origin: [
    'http://localhost:3000',
    'http://localhost:3010',
]
```

## Quick Checklist

- [ ] Backend server is running on port 5001
- [ ] Frontend `.env.local` has `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL`
- [ ] Backend CORS includes your frontend URL (localhost:3000 or localhost:3010)
- [ ] Restarted frontend after adding environment variables
- [ ] Restarted backend after updating CORS
- [ ] Checked browser console for API URL log
- [ ] Tested backend directly with curl/browser

## Common Issues

### Issue: "Network Error" or "Failed to fetch"
**Cause:** Backend not running or wrong URL
**Fix:** Start backend, check API URL in `.env.local`

### Issue: CORS error in console
**Cause:** Backend CORS doesn't allow your frontend origin
**Fix:** Add your frontend URL to CORS origins in `app.js`

### Issue: 404 Not Found
**Cause:** Routes not registered or wrong path
**Fix:** Check routes are registered in `app.js`

### Issue: Connection refused
**Cause:** Backend not running or wrong port
**Fix:** Start backend, verify port matches API URL

## Still Not Working?

1. **Check backend logs:**
   - Look at terminal where backend is running
   - See if requests are reaching backend
   - Check for error messages

2. **Check frontend logs:**
   - Browser console for errors
   - Network tab for failed requests
   - Look for the `📡 PDF API Base URL` log

3. **Verify environment:**
   ```bash
   # In frontend directory
   cat .env.local
   
   # In backend directory  
   cat .env
   ```

4. **Test with curl:**
   ```bash
   # Test backend health
   curl http://localhost:5001/api/subscription/plans
   ```

