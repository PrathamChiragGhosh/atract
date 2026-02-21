# Google OAuth Setup Guide for PDF Compressor

This guide will help you set up Google OAuth for the PDF Compressor feature.

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project (or select existing)**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: "Atract PDF Compressor" (or any name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click on it and click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - User Type: External (unless you have Google Workspace)
     - App name: "Atract PDF Compressor"
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Scopes: Click "Save and Continue" (default scopes are fine)
     - Test users: Add your email if in testing mode, then "Save and Continue"
   
5. **Create OAuth Client ID**
   - Application type: **Web application**
   - Name: "Atract PDF Compressor Web Client"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://yourdomain.com
     ```
     (Add your production domain when deploying)
   
   - **Authorized redirect URIs:**
     ```
     http://localhost:3000/compress-pdf/callback
     https://yourdomain.com/compress-pdf/callback
     ```
     (Add your production callback URL when deploying)
   
   - Click "Create"
   - **IMPORTANT**: Copy the **Client ID** and **Client Secret** (you'll need these)

## Step 2: Configure Frontend Environment Variables

1. **Navigate to frontend directory:**
   ```bash
   cd atract/frontend
   ```

2. **Create or edit `.env.local` file:**
   ```bash
   # Add this line (replace with your actual Client ID)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   ```

   **Example:**
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```

## Step 3: Configure Backend Environment Variables

1. **Navigate to backend directory:**
   ```bash
   cd atract/backend
   ```

2. **Create or edit `.env` file:**
   ```bash
   # Add these lines (replace with your actual credentials)
   GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret-here
   ```

   **Example:**
   ```
   GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
   ```

## Step 4: Restart Your Servers

After adding the environment variables:

1. **Restart Frontend:**
   ```bash
   cd atract/frontend
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Restart Backend:**
   ```bash
   cd atract/backend
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm start
   # or
   node server.js
   ```

## Step 5: Test the Setup

1. Go to your home page
2. Click on the "PDF Compressor Tool" banner
3. You should see the Google login modal
4. Click "Continue with Google"
5. You should be redirected to Google's login page
6. After logging in, you should be redirected back and logged in

## Troubleshooting

### Error: "Google OAuth is not configured"
- **Frontend issue**: Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env.local`
- Make sure the frontend server was restarted after adding the variable
- Check that the variable name is exactly `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (case-sensitive)

### Error: "Google OAuth is not configured on the server"
- **Backend issue**: Check that both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in backend `.env`
- Make sure the backend server was restarted after adding the variables
- Check backend console logs for detailed error messages

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/compress-pdf/callback`
- For production, add your production URL: `https://yourdomain.com/compress-pdf/callback`
- The redirect URI is case-sensitive and must match exactly

### Error: "access_denied"
- User cancelled the login
- Or the app is in testing mode and the user's email is not in the test users list
- Add the user's email to "Test users" in OAuth consent screen

### Error: "invalid_client"
- Client ID or Client Secret is incorrect
- Double-check the credentials in Google Console
- Make sure there are no extra spaces when copying

## Production Deployment

When deploying to production:

1. **Update Google Console:**
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"
   - Example:
     ```
     Authorized JavaScript origins:
     https://yourdomain.com
     
     Authorized redirect URIs:
     https://yourdomain.com/compress-pdf/callback
     ```

2. **Update Environment Variables:**
   - Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in your production frontend environment
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your production backend environment

3. **Publish OAuth Consent Screen:**
   - Go to "OAuth consent screen" in Google Console
   - Click "Publish App" (if still in testing mode)
   - This makes it available to all users

## Security Notes

- **Never commit `.env` or `.env.local` files to Git**
- Keep your Client Secret secure and private
- Use different OAuth credentials for development and production
- Regularly rotate your OAuth credentials

## Need Help?

If you encounter issues:
1. Check the browser console for frontend errors
2. Check the backend server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure the redirect URIs match exactly in Google Console

