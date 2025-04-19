#!/bin/bash
# Deployment script for Smart Ledger

# Exit on error
set -e

echo "🚀 Starting Smart Ledger deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Initialize the database 
echo "🗃️ Initializing database..."
NODE_ENV=production node init-db.js

# Ask for admin credentials if needed
read -p "Create an admin user? (y/n): " create_admin
if [[ $create_admin == "y" ]]; then
  read -p "Enter username: " username
  read -sp "Enter password: " password
  echo
  NODE_ENV=production node create-admin.js $username $password
fi

# Start the application
echo "🚀 Starting the application..."
NODE_ENV=production npm start

echo "✅ Deployment completed successfully!"