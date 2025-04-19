/**
 * Admin user creation script for Smart Ledger
 * 
 * This script creates an admin user for the application
 * 
 * Usage: 
 * - NODE_ENV=production node create-admin.js username password
 */

import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Hash password function (same as in auth.ts)
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createAdminUser() {
  // Get username and password from command line arguments
  const username = process.argv[2];
  const password = process.argv[3];
  
  if (!username || !password) {
    console.error('❌ Error: Username and password are required');
    console.error('Usage: node create-admin.js username password');
    process.exit(1);
  }
  
  try {
    console.log(`🔄 Creating admin user: ${username}`);
    
    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      console.log('⚠️ User already exists');
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Create the user
    const newUser = await db.insert(users)
      .values({ username, password: hashedPassword })
      .returning();
    
    console.log('✅ Admin user created successfully');
    console.log(`User ID: ${newUser[0].id}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdminUser();