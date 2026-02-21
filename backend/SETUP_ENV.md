# Setup Backend .env File

## Step 1: Create/Edit .env file

Create or edit the file: `atract/backend/.env`

## Step 2: Add Google OAuth Credentials

Add these exact lines to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Step 3: Verify File Location

The `.env` file MUST be in: `atract/backend/.env`

Not in `atract/backend/src/.env` or anywhere else!

## Step 4: Restart Backend Server

After adding/editing the .env file:

1. Stop the server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 5: Check Server Logs

When the server starts, you should see:

```
✅ Google OAuth credentials loaded from .env
   Client ID: 731757029428-riti9k...
```

If you see:
```
❌ Google OAuth credentials NOT found in .env file!
```

Then:
1. Check the file path is correct
2. Check for typos in variable names
3. Make sure there are no extra spaces
4. Restart the server

## Common Issues

### Issue: "Google OAuth is not configured"
**Solution:** The .env file is missing or credentials are wrong

### Issue: File not found
**Solution:** Create the file at `atract/backend/.env`

### Issue: Still not working after adding credentials
**Solution:** 
1. Make sure you RESTARTED the server
2. Check for typos (no spaces around = sign)
3. Check file is saved

