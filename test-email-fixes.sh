#!/bin/bash

echo "=== Testing Email Functionality ==="

echo "1. Testing demo Gmail connection:"
curl -v -X POST http://localhost:5000/api/email/demo/connect-gmail \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  --cookie cookie.txt

echo ""
echo "2. Listing email providers:"
curl -v http://localhost:5000/api/email/providers --cookie cookie.txt

echo ""
echo "3. Testing sync with advanced options:"
curl -v -X POST http://localhost:5000/api/email/providers/1/sync \
  -H "Content-Type: application/json" \
  -d '{"dateRangeStart":"2025-03-01", "dateRangeEnd":"2025-04-01", "limit":10}' \
  --cookie cookie.txt

echo ""
echo "4. Listing sync jobs:"
curl -v http://localhost:5000/api/email/sync-jobs --cookie cookie.txt

echo ""
echo "5. Testing disconnect functionality:"
curl -v -X DELETE http://localhost:5000/api/email/providers/1 --cookie cookie.txt

echo ""
echo "=== Tests Complete ==="
