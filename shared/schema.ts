import { pgTable, text, serial, integer, boolean, json, timestamp, numeric, foreignKey, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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

// Email Provider model to store connections to email providers
export const emailProviders = pgTable("email_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerType: text("provider_type").notNull(), // 'gmail', 'outlook', etc.
  email: text("email").notNull(),
  tokens: json("tokens").notNull(), // Store full OAuth tokens as JSON
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const emailProvidersRelations = relations(emailProviders, ({ one }) => ({
  user: one(users, {
    fields: [emailProviders.userId],
    references: [users.id],
  }),
}));

export const insertEmailProviderSchema = createInsertSchema(emailProviders).pick({
  userId: true,
  providerType: true,
  email: true,
  tokens: true,
});

export type InsertEmailProvider = z.infer<typeof insertEmailProviderSchema>;
export type EmailProvider = typeof emailProviders.$inferSelect;

// Email Sync Jobs model to track email scanning processes
export const emailSyncJobs = pgTable("email_sync_jobs", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => emailProviders.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  emailsFound: integer("emails_found"),
  emailsProcessed: integer("emails_processed"),
  receiptsFound: integer("receipts_found"),
  errorMessage: text("error_message"),
  shouldCancel: boolean("should_cancel").default(false),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  requestedLimit: integer("requested_limit") // Limit the number of emails to process
});

export const emailSyncJobsRelations = relations(emailSyncJobs, ({ one }) => ({
  provider: one(emailProviders, {
    fields: [emailSyncJobs.providerId],
    references: [emailProviders.id],
  }),
}));

export const insertEmailSyncJobSchema = createInsertSchema(emailSyncJobs).pick({
  providerId: true,
  status: true,
  startedAt: true,
  dateRangeStart: true,
  dateRangeEnd: true,
  requestedLimit: true,
});

export type InsertEmailSyncJob = z.infer<typeof insertEmailSyncJobSchema>;
export type EmailSyncJob = typeof emailSyncJobs.$inferSelect;

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
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  limit: text("limit").notNull(), // Using text for numeric to avoid type issues
  month: text("month").notNull(), // Format: YYYY-MM
});

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
}));

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
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  merchantName: text("merchantName").notNull(),
  date: timestamp("date").notNull(),
  total: text("total").notNull(), // Using text for numeric to avoid type issues
  items: json("items").notNull().$type<ReceiptItem[]>(),
  category: text("category").default("Others"), // Add category field with default
  source: text("source").default("manual"), // 'manual', 'email', 'scan'
  sourceId: text("source_id"), // Email ID, filename, etc.
  sourceProviderId: integer("source_provider_id").references(() => emailProviders.id)
});

export const receiptsRelations = relations(receipts, ({ one }) => ({
  user: one(users, {
    fields: [receipts.userId],
    references: [users.id],
  }),
  emailProvider: one(emailProviders, {
    fields: [receipts.sourceProviderId],
    references: [emailProviders.id],
  }),
}));

export const insertReceiptSchema = createInsertSchema(receipts).pick({
  userId: true,
  merchantName: true,
  date: true,
  total: true,
  items: true,
  category: true,
  source: true,
  sourceId: true,
  sourceProviderId: true,
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
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'saving', 'budget-alert', 'recurring', 'digest'
  date: timestamp("date").notNull(),
  read: boolean("read").default(false),
  relatedItemId: text("relatedItemId"), // can be receiptId or budgetId
});

export const insightsRelations = relations(insights, ({ one }) => ({
  user: one(users, {
    fields: [insights.userId],
    references: [users.id],
  }),
}));

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

// Add user relations after all tables are defined
export const usersRelations = relations(users, ({ many }) => ({
  budgets: many(budgets),
  receipts: many(receipts),
  insights: many(insights),
  emailProviders: many(emailProviders),
}));
