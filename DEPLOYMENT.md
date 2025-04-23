# Smart Ledger Deployment Guide

This guide explains how to deploy the Smart Ledger application to Netlify and Railway.

## Prerequisites

Before deployment, make sure you have:

1. A GitHub account for hosting your code repository
2. A Netlify account for frontend deployment
3. A Railway account for backend and database deployment
4. An OpenAI API key for AI features

## Step 1: Export Your Project

First, export your project from Replit:

1. Click on the three dots in the Files sidebar
2. Select "Download as zip"
3. Extract the ZIP file to a local folder
4. Initialize a Git repository and push to GitHub:

```bash
cd smart-ledger
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/smart-ledger.git
git push -u origin main
```

## Step 2: Deploy to Railway (Backend + Database)

1. **Sign up or log in to Railway**
   - Go to [Railway.app](https://railway.app)
   - Sign up or log in using your GitHub account

2. **Create a new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Smart Ledger repository

3. **Configure the project**
   - After deployment starts, create a PostgreSQL database service:
     - Click "New Service" → "Database" → "PostgreSQL"
   - Wait for the database to be provisioned

4. **Configure environment variables**
   - Go to your main service (the one created from your GitHub repo)
   - Click "Variables"
   - Add the following variables:
     - `DATABASE_URL`: Copy from the PostgreSQL service's "Connect" tab
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `SESSION_SECRET`: A secure random string (e.g., `crypto.randomBytes(64).toString('hex')`)
     - `PORT`: 5000
     - `NODE_ENV`: production
     - `APP_URL`: The URL of your deployed application (e.g., `https://<your-project-name>.railway.app`)
     - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
     - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

5. **Configure build settings**
   - Go to "Settings"
   - Set build command to: `npm run build`
   - Set start command to: `npm start`

6. **Trigger a deploy**
   - Wait for the deployment to complete
   - Your backend will be running at: `https://<your-project-name>.railway.app`

## Step 3: Deploy to Netlify (Frontend)

1. **Sign up or log in to Netlify**
   - Go to [Netlify.com](https://netlify.com)
   - Sign up or log in using your GitHub account

2. **Create a new site**
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure build settings**
   - Set build command to: `npm run build`
   - Set publish directory to: `dist`

4. **Configure environment variables**
   - Go to "Site settings" → "Environment variables"
   - Add the following:
     - `VITE_API_URL`: Your Railway backend URL (e.g., `https://<your-project-name>.railway.app`)

5. **Deploy the site**
   - Click "Deploy site"
   - Wait for the deployment to complete
   - Your frontend will be available at: `https://<your-site-name>.netlify.app`

## Alternative: Full-Stack Deployment on Railway

If you prefer to host both frontend and backend on Railway:

1. Follow steps 1-5 from the Railway deployment guide
2. Your application will be available at your Railway URL

## Post-Deployment Tasks

After deployment:

1. **Run database migrations**
   - Connect to your app on Railway
   - Run the following command in the Railway shell: `npm run db:push`

2. **Create a test user**
   - Navigate to your deployed application
   - Register a new user through the `/auth` page

3. **Monitor application**
   - Check logs in the Railway dashboard for any errors
   - Monitor application performance

## Configuring Google OAuth for Gmail Integration

To enable Gmail integration in your production environment, follow these steps:

1. **Create a Google Cloud Platform Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Gmail API and People API under "APIs & Services" > "Library"

2. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" as the user type (or "Internal" if using Google Workspace)
   - Fill in the required app information:
     - App name: "Smart Ledger"
     - User support email: your email
     - Developer contact information: your email
   - Add the following scopes:
     - `https://www.googleapis.com/auth/gmail.readonly` (for reading emails)
     - `https://www.googleapis.com/auth/userinfo.email` (for user identification)
   - Add test users if in testing mode

3. **Create OAuth Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" and select "OAuth client ID"
   - Set application type to "Web application"
   - Name your OAuth client (e.g., "Smart Ledger Gmail Integration")
   - Add Authorized JavaScript Origins:
     - Your Railway domain: `https://<your-project-name>.railway.app`
   - Add Authorized Redirect URIs:
     - `https://<your-project-name>.railway.app/api/email/callback/gmail`
   - Click "Create" and note down the Client ID and Client Secret

4. **Add OAuth Credentials to Environment Variables**:
   - Add the following variables to your Railway project:
     - `GOOGLE_CLIENT_ID`: Your OAuth client ID
     - `GOOGLE_CLIENT_SECRET`: Your OAuth client secret
     - `APP_URL`: Your Railway app URL (e.g., `https://<your-project-name>.railway.app`)

5. **Test Gmail Integration**:
   - Log in to your deployed application
   - Navigate to "Upload Receipts" > "Email" tab
   - Click "Connect Gmail Account"
   - Complete the OAuth flow
   - Verify that your Gmail account appears in the connected accounts list

For more detailed information, refer to the [GMAIL_INTEGRATION.md](GMAIL_INTEGRATION.md) file.

## Troubleshooting

### CORS Issues
If you're experiencing CORS issues, add the following to your server configuration:

```javascript
// Add this to server/index.ts before routes are registered
app.use((req, res, next) => {
  const allowedOrigins = ['https://your-netlify-site.netlify.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
```

### Database Connection Issues
If you're having issues connecting to the database:

1. Double-check your `DATABASE_URL` environment variable
2. Ensure the database service is running
3. Check if your IP is allowed in the database firewall settings

### Session Management
For production, consider setting the `secure` flag on cookies:

```javascript
// In server/auth.ts
const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
};
```

### Gmail OAuth Issues

If you're experiencing issues with Gmail OAuth integration:

1. **Redirect URI Mismatch**:
   - The most common error is "redirect_uri_mismatch" which occurs when the URI in your request doesn't match the one registered in Google Cloud Console
   - Ensure the `APP_URL` environment variable is set correctly and matches exactly your deployed application URL
   - Check that the redirect URI in Google Cloud Console includes the exact path `/api/email/callback/gmail`

2. **Invalid Token Errors**:
   - If tokens are not refreshing properly, delete the provider and reconnect
   - Check that both `access_token` and `refresh_token` are being stored correctly

3. **Permission Errors**:
   - Ensure you've enabled the Gmail API in Google Cloud Console
   - Check that you've added the required scopes to your OAuth consent screen
   - Verify that your OAuth app has been verified by Google if you're using it with external users

4. **OAuth Verification**:
   - For production, you may need to verify your app with Google to remove user limits
   - The verification process requires additional documentation and may take several days to complete