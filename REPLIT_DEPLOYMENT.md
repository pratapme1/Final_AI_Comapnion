# Deploying Smart Ledger to Replit

This guide provides step-by-step instructions for deploying Smart Ledger to Replit's production environment with full Gmail integration.

## Current Replit Domain

Your application is currently running on:
```
https://8c4fe4f4-cebf-4df4-85b1-7c7234f20fbf-00-3his7rfbklzu8.kirk.replit.dev
```

Use this domain when configuring external services like Google OAuth.

## 1. Environment Variables Setup

Set these environment variables in Replit's Secrets tab:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for AI features | Yes |
| `GOOGLE_CLIENT_ID` | Client ID from Google Cloud Console | Yes (for Gmail) |
| `GOOGLE_CLIENT_SECRET` | Client Secret from Google Cloud Console | Yes (for Gmail) |
| `SESSION_SECRET` | Random string for session encryption | Yes |
| `APP_URL` | Your Replit domain with https:// prefix | No* |

*`APP_URL` is optional as the application will automatically use the Replit domain if not set.

## 2. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project's "APIs & Services" > "Credentials" page
3. Create or edit an OAuth client ID (Web application type)
4. Add these URLs:
   - **Authorized JavaScript origins**: 
     ```
     https://8c4fe4f4-cebf-4df4-85b1-7c7234f20fbf-00-3his7rfbklzu8.kirk.replit.dev
     ```
   - **Authorized redirect URIs**:
     ```
     https://8c4fe4f4-cebf-4df4-85b1-7c7234f20fbf-00-3his7rfbklzu8.kirk.replit.dev/api/email/callback/gmail
     ```
5. Save and copy the Client ID and Client Secret

## 3. Deployment Process

1. Click the "Deploy" button in the Replit UI
2. Select "Web Service" as the deployment type
3. Your application will be deployed to your Replit domain
4. Database migrations will be applied automatically on first run

## 4. Post-Deployment Verification

1. Visit your Replit domain in a browser
2. Register a new account or login with an existing one
3. Navigate to the "Email Receipts" tab in the Receipts section
4. Try connecting your Gmail account using the "Connect Gmail" button
5. Verify that the OAuth flow completes successfully
6. Check that email scanning functionality works correctly

## 5. Troubleshooting

### Gmail OAuth Issues

If the Gmail integration isn't working properly:

1. **Check the browser console** for any error messages related to the OAuth flow
2. **Verify the redirect URI** - The most common error is "redirect_uri_mismatch" which occurs when the URI in your request doesn't match the one registered in Google Cloud Console
3. **Inspect redirect URLs in the browser** - When connecting Gmail, check if the URL is using HTTPS
4. **Check server logs** - Look for "OAuth redirect URI" log messages to confirm the correct URI is being used

### Database Issues

If encountering database issues:

1. Run `npm run db:push` in the Replit Shell to force schema updates
2. Check database migrations have applied correctly
3. Verify database tables exist and have the correct schema

## 6. Important Notes

- **HTTPS is required** for OAuth to work properly. Replit provides this automatically.
- **Database persistence** is handled by Replit's built-in PostgreSQL database.
- **Frontend assets** are served from the Express server in production mode.
- **Regular updates** to your application can be made by re-deploying when changes are committed.

## 7. Additional Resources

- For more general deployment information, see [DEPLOYMENT.md](DEPLOYMENT.md)
- For Gmail-specific configuration details, see [GMAIL_INTEGRATION.md](GMAIL_INTEGRATION.md)
- For production checklist, see [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)