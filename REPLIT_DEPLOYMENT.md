# Replit Deployment Guide for Smart Ledger

This guide provides step-by-step instructions for deploying the Smart Ledger application to Replit.

## Prerequisites

Before deploying, ensure you have:

1. A Replit account
2. All required environment variables ready
3. Google Cloud OAuth credentials configured correctly
4. Access to a PostgreSQL database

## Environment Setup

### Required Environment Variables

Set the following environment variables in your Replit environment:

- `DATABASE_URL`: Your PostgreSQL database connection string
- `APP_URL`: Your Replit application URL (e.g., `https://your-app.replit.app`)
- `SESSION_SECRET`: A strong random string used for session encryption
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `OPENAI_API_KEY`: Your OpenAI API key for AI functionality

### Database Configuration

1. Make sure your database is accessible from Replit
2. Run the database migrations to set up the schema:
   ```
   NODE_ENV=production npm run db:push
   ```

## Deployment Process

### 1. Clone Repository to Replit

1. Create a new Replit using the "Import from GitHub" option
2. Enter your GitHub repository URL
3. Select the appropriate language (Node.js)

### 2. Install Dependencies

Replit will automatically run `npm install` to install dependencies.

### 3. Configure Secrets

1. Go to the "Secrets" tab in Replit
2. Add all the required environment variables listed above
3. Make sure sensitive keys (like `OPENAI_API_KEY`) are properly secured

### 4. Configure Google OAuth

In your Google Cloud Console project:

1. Add your Replit domain to the Authorized JavaScript origins:
   - `https://your-app.replit.app`

2. Add the callback URL to Authorized redirect URIs:
   - `https://your-app.replit.app/api/email/callback/gmail`

### 5. Configure Run Command

In the `.replit` file, ensure the run command is set to:

```
run = "npm run start:production"
```

### 6. Deploy the Application

1. Click the "Run" button in Replit
2. Replit will build and start your application
3. Your application will be available at your Replit URL

## Troubleshooting

### OAuth Issues

If you encounter OAuth-related issues:

1. Verify that `APP_URL` is set correctly
2. Ensure Google OAuth credentials have the correct domains and callback URLs
3. Check server logs for detailed error messages
4. See the `REPLIT_OAUTH_FIX.md` document for specific fixes

### Database Connection Issues

If the application can't connect to the database:

1. Verify the `DATABASE_URL` is correct and accessible from Replit
2. Check if database credentials are valid
3. Ensure the database schema is properly set up
4. Verify network rules allow connections from Replit IP ranges

### Environment Variable Issues

If environment variables aren't being recognized:

1. Check the Secrets tab in Replit to ensure all variables are set
2. Restart the Replit to ensure environment variables are loaded
3. Verify variable names match exactly what the application expects

## Monitoring and Maintenance

### Viewing Logs

1. Use the Replit console to view application logs
2. Check for any error messages or warnings

### Updating the Application

To update your deployed application:

1. Push changes to your GitHub repository
2. Replit will automatically sync with the latest code
3. Restart the Replit to apply the changes

### Database Management

For database maintenance:

1. Use the `execute_sql_tool` for direct database operations
2. Regular backups are recommended for data safety
3. Use migration tools for schema changes

## Production Checklist

Before finalizing your deployment, ensure:

1. All environment variables are properly set
2. Database migrations are complete
3. Google OAuth is correctly configured
4. HTTPS is enabled (automatically handled by Replit)
5. The application can handle production traffic
6. Error logging is properly configured
7. All sensitive data is securely stored

## Support and Resources

If you encounter issues with Replit deployment:

1. Check the Replit documentation: https://docs.replit.com/
2. Review application logs for specific error messages
3. Consult the `REPLIT_OAUTH_FIX.md` document for OAuth-specific solutions
4. Check the GitHub repository issues for known problems