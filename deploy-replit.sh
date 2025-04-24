#!/bin/bash

# Smart Ledger Replit Deployment Script
# This script prepares and deploys the application to Replit environment

# Display a header
echo "====================================================="
echo "      Smart Ledger Replit Deployment Script"
echo "====================================================="
echo

# Check if running in Replit environment
if [ -z "$REPL_ID" ]; then
  echo "❌ Error: This script should be run in a Replit environment."
  echo "Please run this script directly in your Replit console."
  exit 1
fi

# Check for required environment variables
echo "Checking environment variables..."
REQUIRED_VARS=("DATABASE_URL" "APP_URL" "SESSION_SECRET" "OPENAI_API_KEY")
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ Missing required environment variable: $VAR"
    MISSING_VARS=$((MISSING_VARS+1))
  else
    echo "✅ Found environment variable: $VAR"
  fi
done

# Check Google OAuth variables if Gmail integration is needed
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "⚠️  Warning: Google OAuth credentials are missing. Gmail integration will not work."
fi

if [ $MISSING_VARS -gt 0 ]; then
  echo
  echo "❌ Error: $MISSING_VARS required environment variables are missing."
  echo "Please add them in the Secrets tab in your Replit project."
  exit 1
fi

# Set NODE_ENV to production
export NODE_ENV=production

echo
echo "Preparing for deployment..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building application..."
npm run build

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Check if migrations were successful
if [ $? -ne 0 ]; then
  echo "❌ Error: Database migrations failed."
  echo "Please check your database connection and try again."
  exit 1
fi

# Create admin user if requested
if [ "$1" = "--create-admin" ]; then
  if [ -z "$2" ] || [ -z "$3" ]; then
    echo "❌ Error: Admin username and password required."
    echo "Usage: ./deploy-replit.sh --create-admin <username> <password>"
    exit 1
  fi
  
  echo "Creating admin user..."
  node create-admin.js "$2" "$3"
  
  if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to create admin user."
    exit 1
  fi
  
  echo "✅ Admin user created successfully."
fi

# Start the application
echo
echo "====================================================="
echo "      Deployment Completed Successfully"
echo "====================================================="
echo
echo "Your application is now deployed and running at:"
echo "$APP_URL"
echo
echo "To start the application manually, run:"
echo "npm run start:production"
echo
echo "For troubleshooting, refer to REPLIT_DEPLOYMENT.md"
echo "====================================================="

# Start the application
npm run start:production