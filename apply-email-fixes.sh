#!/bin/bash

echo "Applying email functionality fixes"

# Step 1: Run database migration to ensure all tables exist
echo "Running database migration"
node migrate-db.mjs

# Step 2: Add missing columns to email_sync_jobs table
echo "Adding missing columns to email_sync_jobs table"
cat <<EOF | psql $DATABASE_URL
ALTER TABLE email_sync_jobs 
ADD COLUMN IF NOT EXISTS should_cancel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS date_range_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_range_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS requested_limit INTEGER;
EOF

# Step 3: Fix demo Gmail connection in routes.ts
echo "Updating email routes.ts to fix demo connection"

# Find the file
EMAIL_ROUTES_FILE=$(find ./server -name routes.ts -path "*email*")

if [ -n "$EMAIL_ROUTES_FILE" ]; then
  # Replace require with direct db import
  sed -i 's/const { db } = require(.*)\/\/ Import db here to avoid possible circular imports/\/\/ Use imported db directly from top of file/' $EMAIL_ROUTES_FILE
  
  # Ensure shouldCancel is included in demo job creation
  sed -i '/receiptsFound: 5,/a\ \ \ \ \ \ shouldCancel: false,' $EMAIL_ROUTES_FILE
  
  echo "Email routes file updated: $EMAIL_ROUTES_FILE"
else
  echo "Email routes file not found"
fi

echo "Email functionality fixes applied successfully"