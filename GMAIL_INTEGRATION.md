# Gmail Integration for Smart Ledger

This guide explains how to configure and deploy the Gmail integration for Smart Ledger in a production environment.

## Overview

The Gmail integration allows users to connect their Gmail accounts to Smart Ledger, which will then automatically scan emails for receipts and extract the data. This guide covers both the development setup and production deployment configurations.

## Requirements

1. Google Cloud Platform account
2. OAuth 2.0 credentials (Client ID and Client Secret)
3. Deployed Smart Ledger application with HTTPS enabled
4. Access to environment variables configuration

## Google Cloud Platform Setup

### Creating a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down the Project ID for future reference

### Enabling Required APIs

In your Google Cloud project:

1. Navigate to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - Gmail API
   - Google People API (for user profile information)
   - OAuth2 API

### Creating OAuth Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" and select "OAuth client ID"
3. Set application type to "Web application"
4. Name your OAuth client (e.g., "Smart Ledger Gmail Integration")
5. Add Authorized JavaScript Origins:
   - Development: `http://localhost:5000`
   - Production: `https://your-domain.com`
6. Add Authorized Redirect URIs:
   - Development: `http://localhost:5000/api/email/gmail/auth/callback`
   - Production: `https://your-domain.com/api/email/gmail/auth/callback`
7. Click "Create" and note down the Client ID and Client Secret

### Configuring OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (or "Internal" if using Google Workspace)
3. Fill in the required app information:
   - App name: "Smart Ledger"
   - User support email: your email
   - Developer contact information: your email
4. Add the following scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` (for reading emails)
   - `https://www.googleapis.com/auth/userinfo.email` (for user identification)
5. Add test users if in testing mode (this is required if your app is not verified)

## Environment Configuration

Add the following environment variables to your application:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
APP_URL=https://your-domain.com
```

### Docker Compose

If using Docker Compose, ensure these variables are added to your `docker-compose.yml`:

```yaml
environment:
  - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
  - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
  - APP_URL=${APP_URL}
```

### Railway

If deploying to Railway:
1. Go to your project settings
2. Add these variables in the "Variables" section

## Implementation Details

### Database Tables

The Gmail integration uses two primary database tables:

1. `email_providers` - Stores connected email accounts and OAuth tokens
2. `email_sync_jobs` - Tracks the status of email scanning jobs

### Authentication Flow

1. User clicks "Connect Gmail" button
2. User is redirected to Google OAuth consent screen
3. After granting permission, Google redirects to our callback URL
4. Server exchanges authorization code for access/refresh tokens
5. Tokens are stored in database for future API calls

### Email Scanning Process

When a user triggers a sync:

1. Access token is retrieved or refreshed
2. Gmail API is queried for emails with potential receipts
3. Matching emails are processed
4. Receipt data is extracted using AI
5. Extracted data is inserted into the receipts table

## Testing in Development

For development environments, we've implemented a simplified mock connection:

1. Navigate to the Upload Receipts page
2. Click on "Email" tab
3. Use the "Connect Demo Gmail Account" button
4. This will create mock records without actual OAuth flow

## Production Verification

After deployment, verify the Gmail integration is working properly:

1. Log in to your application
2. Navigate to the Upload Receipts page
3. Click on the "Email" tab
4. Click "Connect Gmail Account"
5. Complete the OAuth flow
6. Verify the connected account appears in the list
7. Test sync functionality

## Troubleshooting

### OAuth Errors

If you encounter "invalid_grant" or other OAuth errors:
- Verify that your redirect URIs are exactly correct (including https/http)
- Check that your Client ID and Secret are correctly set
- Ensure your OAuth consent screen is properly configured
- Verify that required APIs are enabled

### Email Scanning Issues

If email scanning doesn't find receipts:
- Check console logs for API errors
- Verify that the Gmail API is enabled
- Ensure the user has granted the correct permissions
- Check for token expiration issues

### Token Storage

OAuth tokens are stored in the database with:
- Access token (short-lived)
- Refresh token (long-lived)
- Expiration timestamp

The system automatically refreshes tokens when needed.

## Security Considerations

- Always use HTTPS in production
- Store tokens securely (encrypted if possible)
- Implement proper OAuth state validation to prevent CSRF attacks
- Request only the minimum required scopes

## Gmail API Quotas

Be aware of Gmail API quotas:
- Standard projects have a limit of 1 billion units/day
- Each read request costs approximately 5-20 units
- Monitor your usage in Google Cloud Console

## Next Steps for Enhancement

- Implement email attachment processing
- Add support for additional email providers (Outlook, etc.)
- Improve receipt detection algorithms
- Add selective email filtering options for users