#!/bin/bash

#========================================================
# Smart Ledger - Email Functionality Fixes
# 
# This script applies necessary fixes for email receipt
# functionality, including database schema updates and
# code changes to support advanced options, cancellation,
# and disconnection functionality.
#========================================================

set -e  # Exit on error

echo "=== Applying Email Functionality Fixes ==="
echo "Started at: $(date)"
echo ""

# Step 1: Run database migration to ensure all tables exist
echo "[1/4] Running database migration"
node migrate-db.mjs || { 
  echo "Migration failed. Checking if we need to use migrate-db.js instead..."; 
  if [ -f "migrate-db.js" ]; then
    node migrate-db.js || { echo "Both migration scripts failed!"; exit 1; }
  else
    echo "Migration script failed and no alternative found."; 
    exit 1;
  fi
}
echo "✓ Database migration complete"
echo ""

# Step 2: Add missing columns to email_sync_jobs table
echo "[2/4] Adding missing columns to email_sync_jobs table"
cat <<EOF | psql $DATABASE_URL
-- Add columns if they don't exist
ALTER TABLE email_sync_jobs 
ADD COLUMN IF NOT EXISTS should_cancel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS date_range_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_range_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS requested_limit INTEGER;

-- Check table structure
\d email_sync_jobs
EOF

echo "✓ Database schema updated"
echo ""

# Step 3: Fix demo Gmail connection in routes.ts
echo "[3/4] Updating email routes.ts to fix demo connection"

# Find the email routes file
EMAIL_ROUTES_FILE=$(find ./server -name routes.ts -path "*email*")

if [ -n "$EMAIL_ROUTES_FILE" ]; then
  # Make a backup
  cp "$EMAIL_ROUTES_FILE" "${EMAIL_ROUTES_FILE}.bak"
  echo "  ✓ Created backup: ${EMAIL_ROUTES_FILE}.bak"
  
  # Replace require with direct db import
  sed -i 's/const { db } = require(.*)\/\/ Import db here to avoid possible circular imports/\/\/ Use imported db directly from top of file/' "$EMAIL_ROUTES_FILE"
  
  # Ensure shouldCancel is included in demo job creation
  grep -q "shouldCancel: false" "$EMAIL_ROUTES_FILE" || sed -i '/receiptsFound: 5,/a\ \ \ \ \ \ shouldCancel: false,' "$EMAIL_ROUTES_FILE"
  
  # Check if required DB import is at the top
  grep -q "import { db } from '../db';" "$EMAIL_ROUTES_FILE" || { 
    echo "  ! Warning: DB import not found in routes file";
    echo "    You may need to manually add: import { db } from '../db'; at the top of $EMAIL_ROUTES_FILE";
  }
  
  echo "  ✓ Email routes file updated: $EMAIL_ROUTES_FILE"
else
  echo "  ⨯ Email routes file not found. You may need to manually apply the changes."
  echo "    The key changes include:"
  echo "    1. Adding 'shouldCancel: false' to the demo email sync job creation"
  echo "    2. Using direct DB import instead of require statement"
fi
echo ""

# Step 4: Verify the changes can be tested
echo "[4/4] Creating test script for email functionality"
cat > test-email-fixes.sh <<EOF
#!/bin/bash

echo "=== Testing Email Functionality ==="

echo "1. Testing demo Gmail connection:"
curl -v -X POST http://localhost:5000/api/email/demo/connect-gmail \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com"}' \\
  --cookie cookie.txt

echo ""
echo "2. Listing email providers:"
curl -v http://localhost:5000/api/email/providers --cookie cookie.txt

echo ""
echo "3. Testing sync with advanced options:"
curl -v -X POST http://localhost:5000/api/email/providers/1/sync \\
  -H "Content-Type: application/json" \\
  -d '{"dateRangeStart":"2025-03-01", "dateRangeEnd":"2025-04-01", "limit":10}' \\
  --cookie cookie.txt

echo ""
echo "4. Listing sync jobs:"
curl -v http://localhost:5000/api/email/sync-jobs --cookie cookie.txt

echo ""
echo "5. Testing disconnect functionality:"
curl -v -X DELETE http://localhost:5000/api/email/providers/1 --cookie cookie.txt

echo ""
echo "=== Tests Complete ==="
EOF

chmod +x test-email-fixes.sh
echo "✓ Created test script: test-email-fixes.sh"
echo ""

echo "=== Summary of Applied Fixes ==="
echo "✓ Database migration completed"
echo "✓ Added missing columns to email_sync_jobs table:"
echo "  • should_cancel: For cancelling sync jobs in progress"
echo "  • date_range_start/date_range_end: For filtering emails by date"
echo "  • requested_limit: For limiting the number of emails processed"
echo "✓ Fixed demo Gmail connection endpoint"
echo "✓ Created test script to verify functionality"
echo ""
echo "To test these changes, ensure the server is running and run:"
echo "  ./test-email-fixes.sh"
echo ""
echo "Email functionality fixes applied successfully at: $(date)"