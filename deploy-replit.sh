#!/bin/bash

# Smart Ledger Replit Deployment Script
# Usage: ./deploy-replit.sh

echo "----------------------------------------"
echo "Smart Ledger Replit Deployment Script"
echo "----------------------------------------"

# Check required environment variables
echo "Checking environment variables..."
REQUIRED_VARS=("OPENAI_API_KEY" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "SESSION_SECRET")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables:"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "   - $VAR"
  done
  echo "Please set these in the Replit Secrets tab before deploying."
  exit 1
fi

echo "✅ Environment variables check passed"

# Set NODE_ENV to production for deployment
export NODE_ENV=production

# Build the application
echo "Building the application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Check the errors above."
  exit 1
fi

echo "✅ Build complete"

# Migrate the database
echo "Migrating database schema..."
npm run db:push

if [ $? -ne 0 ]; then
  echo "❌ Database migration failed. Check the errors above."
  exit 1
fi

echo "✅ Database migration complete"

# Create default categories if needed
echo "Setting up default data..."
node init-db.js

if [ $? -ne 0 ]; then
  echo "❌ Default data setup failed. Check the errors above."
  exit 1
fi

echo "✅ Default data setup complete"

# Set up APP_URL if not already set
if [ -z "$APP_URL" ] && [ -n "$REPLIT_DOMAINS" ]; then
  DOMAIN=$(echo $REPLIT_DOMAINS | cut -d ',' -f1)
  export APP_URL="https://$DOMAIN"
  echo "ℹ️ APP_URL not set, using Replit domain: $APP_URL"
fi

echo ""
echo "----------------------------------------"
echo "✅ Deployment preparation complete!"
echo "----------------------------------------"
echo ""
echo "Your application is ready to be deployed on Replit."
echo "Click the 'Deploy' button in the Replit UI to complete deployment."
echo ""
echo "After deployment, your application will be available at:"
echo "  $APP_URL"
echo ""
echo "Google OAuth Redirect URI to configure:"
echo "  $APP_URL/api/email/callback/gmail"
echo ""
echo "----------------------------------------"