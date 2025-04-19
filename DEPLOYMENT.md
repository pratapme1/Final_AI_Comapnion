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