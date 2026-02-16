
# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for Adam's Club.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Adams Club")
4. Click "Create"

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Adam's Club
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the Scopes page, click **Add or Remove Scopes**
7. Select these scopes:
   - `openid`
   - `email`
   - `profile`
8. Click **Update** → **Save and Continue**
9. Add test users if needed (for development)
10. Click **Save and Continue** → **Back to Dashboard**

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Application type**: Web application
4. Enter **Name**: Adam's Club Web Client
5. Under **Authorized JavaScript origins**, add:
   - For local development: `http://localhost:5000`
   - For Replit deployment: `https://your-repl-name.your-username.repl.co`
6. Under **Authorized redirect URIs**, add:
   - For local development: `http://localhost:5000/auth/google/callback`
   - For Replit deployment: `https://your-repl-name.your-username.repl.co/auth/google/callback`
7. Click **Create**
8. Copy your **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add the following variables:

```env
# Database
DATABASE_URL=your_database_url_here

# Session
SESSION_SECRET=your_random_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
BASE_URL=http://localhost:5000

# For production deployment on Replit:
# BASE_URL=https://your-repl-name.your-username.repl.co
```

3. **Never commit the `.env` file to version control**

## Step 5: Restart Your Application

After configuring the environment variables:

1. Stop your development server
2. Start it again with `npm run dev`
3. The console should show: `✅ Google OAuth configured`

## Testing

1. Navigate to `/auth` in your browser
2. Click "Continue with Google"
3. You should be redirected to Google's sign-in page
4. After successful authentication, you'll be redirected back to `/home`
5. Check that your profile appears correctly

## Troubleshooting

### "Error: redirect_uri_mismatch"

- Ensure the redirect URI in Google Cloud Console exactly matches `${BASE_URL}/auth/google/callback`
- Check that `BASE_URL` in `.env` doesn't have a trailing slash

### "Google OAuth not configured" warning in console

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart your application after adding environment variables

### Session not persisting

- Ensure `SESSION_SECRET` is set in `.env`
- Check that cookies are enabled in your browser
- Verify `DATABASE_URL` is correctly configured

## Security Notes

- Always use HTTPS in production (Replit deployments use HTTPS by default)
- Keep your `GOOGLE_CLIENT_SECRET` private
- Never expose credentials in client-side code
- Use environment variables for all sensitive configuration
- Review and update OAuth scopes as needed

## Production Deployment on Replit

When deploying to production:

1. Go to the Secrets tool in Replit
2. Add all environment variables from your `.env` file
3. Update `BASE_URL` to your Replit deployment URL
4. Update the authorized redirect URI in Google Cloud Console
5. Redeploy your application

Your OAuth flow will now work in production!
