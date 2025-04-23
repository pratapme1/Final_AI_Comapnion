# Production Deployment Checklist for Smart Ledger

Use this checklist to ensure a successful deployment of Smart Ledger with full Gmail integration to your production environment.

## Google OAuth Setup

- [ ] Create a Google Cloud Platform project
- [ ] Enable Gmail API and People API
- [ ] Configure OAuth consent screen with required scopes:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/userinfo.email`
- [ ] Create OAuth credentials (Web application)
- [ ] Add authorized JavaScript origins: `https://ai-companion-vishnupratapkum.replit.app`
- [ ] Add authorized redirect URI: `https://ai-companion-vishnupratapkum.replit.app/api/email/callback/gmail`
- [ ] Save Client ID and Client Secret for environment variables

## Environment Variables Setup

- [ ] `NODE_ENV=production`
- [ ] `PORT=5000` (or platform-specific port)
- [ ] `APP_URL=https://ai-companion-vishnupratapkum.replit.app` (must match OAuth settings)
- [ ] `GOOGLE_CLIENT_ID=your_client_id`
- [ ] `GOOGLE_CLIENT_SECRET=your_client_secret`
- [ ] `DATABASE_URL=your_database_connection_string`
- [ ] `OPENAI_API_KEY=your_openai_api_key`
- [ ] `SESSION_SECRET=your_random_secure_string`

## Database Setup

- [ ] Ensure PostgreSQL database is provisioned
- [ ] Verify database connection string is correct
- [ ] Run migrations with `npm run db:push`
- [ ] Verify tables are created correctly

## Deployment Steps

### If Using Docker/Docker Compose:

- [ ] Set environment variables in `.env` file or deployment platform
- [ ] Build the Docker image: `docker-compose build`
- [ ] Start the containers: `docker-compose up -d`
- [ ] Verify logs for successful startup

### If Using Railway:

- [ ] Set all environment variables in Railway dashboard
- [ ] Deploy application from GitHub repository
- [ ] Provision PostgreSQL database
- [ ] Run migration command in Railway shell: `npm run db:push`
- [ ] Verify application is running correctly

## Post-Deployment Verification

- [ ] Access the application through browser
- [ ] Register a new user or verify login works
- [ ] Check that budget, receipt, and analytics features work
- [ ] Test Gmail integration by connecting a test account
- [ ] Verify that OAuth flow completes successfully
- [ ] Check database for properly stored tokens
- [ ] Test email scanning functionality

## Troubleshooting Common Issues

- [ ] Redirect URI mismatch: Verify URIs match exactly between Google Console and APP_URL
- [ ] CORS issues: Check CORS configuration if using separate frontend/backend domains
- [ ] Database connection: Ensure firewall settings allow connections
- [ ] Cookie issues: Verify cookie settings for HTTPS environment
- [ ] OAuth errors: Check logs for detailed error messages

## Security Considerations

- [ ] Ensure all sensitive environment variables are secured
- [ ] Verify HTTPS is enabled for all endpoints
- [ ] Consider implementing rate limiting for API endpoints
- [ ] Review database access permissions
- [ ] Use secure cookie settings in production

## Additional Resources

For more detailed guidance:
- Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for general deployment steps
- Refer to [GMAIL_INTEGRATION.md](GMAIL_INTEGRATION.md) for Gmail-specific configuration
- Refer to [EMAIL_RECEIPT_EXTRACTION.md](EMAIL_RECEIPT_EXTRACTION.md) for email processing details