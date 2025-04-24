# Gmail OAuth Integration Guide for Smart Ledger

This guide provides instructions for setting up and troubleshooting the Gmail OAuth integration for the Smart Ledger application.

## Prerequisites

Before you can use the Gmail OAuth integration, you need:

1. A Google Cloud Platform project with the Gmail API enabled
2. OAuth 2.0 credentials configured
3. Proper environment variables set in the Replit environment

## Environment Variables

The following environment variables must be set:

- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
- `APP_URL` - The base URL of your application (e.g., https://your-app.replit.app)

## Google Cloud Platform Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API for your project
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `https://your-app.replit.app`
   - Authorized redirect URIs: `https://your-app.replit.app/api/email/callback/gmail`

## Replit Configuration

1. Add the necessary environment variables to your Replit environment
2. Ensure the APP_URL is set to your Replit app's full URL

## How It Works

The Gmail OAuth flow works as follows:

1. User clicks "Connect Gmail" in the application UI
2. Application redirects user to Google's OAuth consent screen
3. User grants access to their Gmail account
4. Google redirects back to the callback URL with an authorization code
5. The server exchanges the code for access and refresh tokens
6. The tokens are stored securely in the database
7. The user is redirected back to the application

## Debugging OAuth Issues

If you encounter OAuth issues:

1. Check the server logs for detailed error messages
2. Verify that the `APP_URL` environment variable is set correctly
3. Ensure the redirect URIs in Google Cloud Console match your application URLs
4. Confirm that cookies and third-party cookies are enabled in the browser
5. Try the process in an incognito/private browsing window

## OAuth Callback Improvements

The application uses an HTML-based redirect approach to handle OAuth callbacks. This approach:

1. Avoids CORS issues with different domains
2. Works reliably on Replit's environment
3. Provides a better user experience during the OAuth process
4. Handles errors gracefully

## Refreshing Tokens

The application automatically refreshes expired OAuth tokens when:

1. Syncing emails
2. Processing individual emails
3. Verifying token validity

## Security Considerations

1. OAuth tokens are stored securely in the database
2. Only token existence status is exposed to the frontend
3. User must authenticate with Smart Ledger before connecting Gmail
4. Proper error handling prevents sensitive information leakage

## Support

If you encounter persistent OAuth issues:

1. Check that your Google OAuth credentials have the correct redirect URIs
2. Verify that the Gmail API is enabled in your Google Cloud project
3. Ensure the necessary environment variables are set
4. Review the application logs for detailed error information