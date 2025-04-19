/**
 * Database initialization script for Smart Ledger
 * 
 * This script will:
 * 1. Push the Drizzle ORM schema to the database
 * 2. Create default categories if they don't exist
 * 
 * Usage: 
 * - NODE_ENV=production node init-db.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from './server/db.js';
import { categories } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

// Default categories to be created
const DEFAULT_CATEGORIES = [
  { name: 'Groceries' },
  { name: 'Dining' },
  { name: 'Utilities' },
  { name: 'Transportation' },
  { name: 'Entertainment' },
  { name: 'Shopping' },
  { name: 'Healthcare' },
  { name: 'Housing' },
  { name: 'Travel' },
  { name: 'Others' }
];

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Push schema using drizzle-kit
    console.log('📦 Pushing schema to database...');
    await execAsync('npm run db:push');
    console.log('✅ Schema pushed successfully');
    
    // Create default categories if they don't exist
    console.log('🏷️ Checking for default categories...');
    
    for (const category of DEFAULT_CATEGORIES) {
      // Check if category exists
      const existingCategory = await db.select()
        .from(categories)
        .where(eq(categories.name, category.name));
      
      if (existingCategory.length === 0) {
        console.log(`Creating category: ${category.name}`);
        await db.insert(categories).values(category);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }
    
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initDatabase();