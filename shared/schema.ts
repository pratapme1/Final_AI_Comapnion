import { pgTable, text, serial, integer, boolean, json, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Category model
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Budget model
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  category: text("category").notNull(),
  limit: numeric("limit").notNull(),
  month: text("month").notNull(), // Format: YYYY-MM
});

export const insertBudgetSchema = createInsertSchema(budgets).pick({
  userId: true,
  category: true,
  limit: true,
  month: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Receipt model
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  merchantName: text("merchantName").notNull(),
  date: timestamp("date").notNull(),
  total: numeric("total").notNull(),
  items: json("items").notNull().$type<ReceiptItem[]>(),
});

export const insertReceiptSchema = createInsertSchema(receipts).pick({
  userId: true,
  merchantName: true,
  date: true,
  total: true,
  items: true,
});

// Receipt Item type
export interface ReceiptItem {
  name: string;
  price: number;
  category?: string;
  gptInsight?: string;
  recurring?: boolean;
}

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

// Insight model
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'saving', 'budget-alert', 'recurring', 'digest'
  date: timestamp("date").notNull(),
  read: boolean("read").default(false),
  relatedItemId: text("relatedItemId"), // can be receiptId or budgetId
});

export const insertInsightSchema = createInsertSchema(insights).pick({
  userId: true,
  content: true,
  type: true,
  date: true,
  read: true,
  relatedItemId: true,
});

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;

// Stats model - For dashboard statistics
export interface Stats {
  totalSpend: number;
  budgetRemaining: number;
  potentialSavings: number;
  suggestionsCount: number;
  recurringExpenses: number;
  subscriptionsCount: number;
  spendingTrend: number; // percentage change from last month
}

// Budget status - For tracking budget progress
export interface BudgetStatus {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  status: 'normal' | 'warning' | 'exceeded';
}

// Spending by category - For charts
export interface CategorySpending {
  category: string;
  amount: number;
  color: string;
}

// Monthly spending data for charts
export interface MonthlySpending {
  month: string;
  amount: number;
  categories: Record<string, number>;
}
