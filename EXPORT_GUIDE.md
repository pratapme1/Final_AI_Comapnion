# Smart Ledger Export Guide

This guide provides detailed instructions on how to export your Smart Ledger application from Replit and prepare it for deployment on various hosting platforms.

## 1. Export from Replit

### Option 1: Download as ZIP
1. In Replit, click on the three dots in the Files sidebar
2. Select "Download as zip"
3. Save the ZIP file to your local machine
4. Extract the ZIP to a folder on your computer

### Option 2: Clone with Git
If you've linked a GitHub repository:
1. Get the repository URL from the "Version Control" tab in Replit
2. Open a terminal on your local machine
3. Run `git clone https://github.com/yourusername/your-repo.git`

## 2. Prepare for Deployment

### Environment Variables
Make sure to create a `.env` file based on the provided `.env.example` with these variables:
```
DATABASE_URL=postgres://user:password@host:port/database
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_secure_random_string
PORT=5000
```

### Database Setup
You'll need a PostgreSQL database for deployment. Options include:
- Managed PostgreSQL (Railway, Supabase, Neon, etc.)
- Self-hosted PostgreSQL
- Docker (using the provided docker-compose.yml)

After setting up the database, run database migrations:
```bash
NODE_ENV=production node init-db.js
```

## 3. Deploy Options

### Option 1: Railway App
Railway provides a simple deployment process and includes PostgreSQL hosting.

1. Create a new project in Railway
2. Connect your GitHub repository (or use the Railway CLI to push code)
3. Add a PostgreSQL database service
4. Set environment variables (see above)
5. Deploy your application

### Option 2: Netlify
For Netlify, you'll need to deploy the frontend on Netlify and backend separately:

1. Create a new site in Netlify
2. Connect your GitHub repository
3. Set build command to `npm run build`
4. Set publish directory to `dist`
5. Add environment variables
6. Deploy your backend separately (Railway, Heroku, etc.)

### Option 3: Docker Deployment
Use Docker for a fully containerized deployment:

1. Install Docker and Docker Compose on your server
2. Copy your project files to the server
3. Create a `.env` file with your environment variables
4. Run `docker-compose up -d` to start the application
5. Initialize the database: `docker-compose exec app node init-db.js`
6. Create an admin user: `docker-compose exec app node create-admin.js username password`

### Option 4: Custom VPS/Server
For a custom server deployment:

1. Copy your project files to the server
2. Install Node.js and npm
3. Set up PostgreSQL
4. Install dependencies: `npm install`
5. Build the application: `npm run build`
6. Set environment variables
7. Run the deployment script: `bash deploy.sh`

## 4. Post-Deployment

After deployment, make sure to:

1. Create an admin user if you haven't yet
2. Test the authentication system
3. Verify that all APIs are working correctly
4. Monitor logs for any errors

## Troubleshooting

### CORS Issues
If you're experiencing CORS issues when deploying frontend and backend separately:
- Update the API_BASE_URL in client/src/lib/queryClient.ts
- Ensure proper CORS headers are set up in server/index.ts

### Database Connection Problems
If you can't connect to the database:
- Verify DATABASE_URL is correct
- Check if the database server allows connections from your application
- Ensure all required tables exist by running the init-db.js script

### Authentication Issues
If login/registration isn't working:
- Verify SESSION_SECRET is set
- Check if cookies are being properly set and sent
- Ensure the database tables for users exist