# Gmail OAuth Fix For Replit Deployment

This document describes the fixes implemented to ensure Gmail OAuth works correctly on your custom Replit domain.

## Summary of Changes

1. **Server-side OAuth Flow**:
   - Modified `/api/email/auth/gmail` to return the auth URL as JSON instead of redirecting
   - This prevents CORS errors when redirecting across domains

2. **Client-side Handling**:
   - The client now handles the OAuth redirection through client-side JavaScript
   - This ensures the browser properly handles the cross-origin navigation

3. **Domain Detection Improvements**:
   - Added multiple fallback mechanisms to detect your custom domain
   - Added explicit support for the `CUSTOM_DOMAIN` environment variable
   - Hardcoded your specific domain (ai-companion-vishnupratapkum.replit.app) as a fallback

4. **Protocol Enforcement**:
   - Added code to ensure HTTPS is always used for Replit domains
   - Prevents mixed content and security issues

## How to Test After Deployment

1. Log into your application on your custom domain
2. Navigate to the Email Receipts tab
3. Click "Connect Gmail"
4. You should see a Google login screen without CORS errors
5. After authentication, you'll be redirected back to your application

## Troubleshooting

If you still encounter issues:

1. Check the browser console for any error messages
2. Look for "OAuth redirect URI" in the server logs to confirm the correct domain is being used
3. Verify that your Google Cloud Console credentials are configured with the exact URLs mentioned in the documentation
4. Try setting the `APP_URL` environment variable explicitly to `https://ai-companion-vishnupratapkum.replit.app`

## Environment Variables

For optimal configuration, set these environment variables in Replit:

| Variable | Value | Purpose |
|----------|-------|---------|
| `APP_URL` | `https://ai-companion-vishnupratapkum.replit.app` | Explicitly define the app's base URL |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Required for Gmail API access |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret | Required for Gmail API access |
