/**
 * Database migration script for Smart Ledger
 * 
 * This script pushes the schema from Drizzle to the PostgreSQL database.
 * It creates any missing tables or columns.
 */

const { execSync } = require('child_process');
const path = require('path');

async function migrateTables() {
  try {
    console.log('Pushing schema to database...');
    
    // Execute the Drizzle push command with --accept-data-loss flag to automatically accept table creation
    const output = execSync('npx drizzle-kit push --accept-data-loss', { stdio: 'inherit' });
    
    console.log('Schema migration successful!');
    
    return true;
  } catch (error) {
    console.error('Error during database migration:', error.message);
    return false;
  }
}

// Run the migration
migrateTables().then((success) => {
  if (success) {
    console.log('Migration completed successfully.');
    process.exit(0);
  } else {
    console.error('Migration failed.');
    process.exit(1);
  }
});