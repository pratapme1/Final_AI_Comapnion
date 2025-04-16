import { db } from "./db";
import { users, categories, budgets } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Check if users table already has data
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already has users, skipping seed");
    return;
  }

  // Create demo user
  const hashedPassword = await hashPassword("demo123");
  const [demoUser] = await db.insert(users).values({
    username: "demo",
    password: hashedPassword
  }).returning();
  
  // Create test user with plain text password for development
  const [testUser] = await db.insert(users).values({
    username: "testuser2",
    password: await hashPassword("password123")
  }).returning();

  console.log(`Created users: demo, testuser2`);

  // Create default categories
  const defaultCategories = [
    "Groceries", "Dining", "Utilities", "Transportation", 
    "Entertainment", "Shopping", "Health", "Travel", "Personal Care", "Others"
  ];
  
  for (const name of defaultCategories) {
    await db.insert(categories).values({ name }).returning();
  }
  
  console.log(`Created ${defaultCategories.length} categories`);

  // Create sample budgets for demo user
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const sampleBudgets = [
    { userId: demoUser.id, category: "Groceries", limit: "8000", month: currentMonth },
    { userId: demoUser.id, category: "Dining", limit: "4000", month: currentMonth },
    { userId: demoUser.id, category: "Utilities", limit: "5000", month: currentMonth },
    { userId: demoUser.id, category: "Transportation", limit: "4000", month: currentMonth },
    { userId: demoUser.id, category: "Entertainment", limit: "3000", month: currentMonth }
  ];

  for (const budget of sampleBudgets) {
    await db.insert(budgets).values(budget).returning();
  }

  console.log(`Created ${sampleBudgets.length} sample budgets for demo user`);

  console.log("✅ Seed completed successfully");
}

main()
  .catch(e => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });