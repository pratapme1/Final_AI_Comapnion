/**
 * Database migration script for Smart Ledger
 * 
 * This script manually creates the email-related tables in the database.
 */

import { execSync } from 'child_process';
import pg from 'pg';

// Connect to the database
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createEmailTables() {
  try {
    console.log('Creating email-related tables...');
    
    // Create email_providers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_providers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_type TEXT NOT NULL,
        email TEXT NOT NULL,
        tokens JSONB NOT NULL,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created email_providers table');
    
    // Create email_sync_jobs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_sync_jobs (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES email_providers(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        emails_found INTEGER,
        emails_processed INTEGER,
        receipts_found INTEGER,
        error_message TEXT
      );
    `);
    console.log('Created email_sync_jobs table');
    
    // Add source fields to receipts table if not exists
    try {
      await pool.query(`
        ALTER TABLE receipts 
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS source_id TEXT,
        ADD COLUMN IF NOT EXISTS source_provider_id INTEGER REFERENCES email_providers(id);
      `);
      console.log('Updated receipts table with source fields');
    } catch (err) {
      console.log('Note: Receipts table may already have the source fields', err.message);
    }
    
    console.log('Schema migration successful!');
    return true;
  } catch (error) {
    console.error('Error during database migration:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the migration
createEmailTables().then((success) => {
  if (success) {
    console.log('Migration completed successfully.');
    process.exit(0);
  } else {
    console.error('Migration failed.');
    process.exit(1);
  }
});