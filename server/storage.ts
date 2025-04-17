import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  budgets, type Budget, type InsertBudget,
  receipts, type Receipt, type InsertReceipt, type ReceiptItem,
  insights, type Insight, type InsertInsight,
  type Stats, type BudgetStatus, type CategorySpending, type MonthlySpending
} from "@shared/schema";
import { db, pool } from "./db";
import { and, eq, desc, gte, lte } from "drizzle-orm";

// Storage interface with all CRUD methods
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Budget methods
  getBudgets(userId: number): Promise<Budget[]>;
  getBudgetsByMonth(userId: number, month: string): Promise<Budget[]>;
  getBudget(userId: number, category: string, month: string): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, limit: string): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // Receipt methods
  getReceipts(userId: number): Promise<Receipt[]>;
  getReceiptsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Receipt[]>;
  getReceipt(id: number): Promise<Receipt | undefined>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceiptItem(receiptId: number, itemIndex: number, updates: Partial<ReceiptItem>): Promise<Receipt | undefined>;
  deleteReceipt(id: number): Promise<boolean>;
  
  // Insight methods
  getInsights(userId: number): Promise<Insight[]>;
  getInsightsByType(userId: number, type: string): Promise<Insight[]>;
  getInsight(id: number): Promise<Insight | undefined>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  markInsightAsRead(id: number): Promise<Insight | undefined>;
  
  // Stats methods
  getStats(userId: number): Promise<Stats>;
  getBudgetStatuses(userId: number): Promise<BudgetStatus[]>;
  getCategorySpending(userId: number): Promise<CategorySpending[]>;
  getMonthlySpending(userId: number, months: number): Promise<MonthlySpending[]>;

  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private budgets: Map<number, Budget>;
  private receipts: Map<number, Receipt>;
  private insights: Map<number, Insight>;
  
  private currentUserId: number;
  private currentCategoryId: number;
  private currentBudgetId: number;
  private currentReceiptId: number;
  private currentInsightId: number;
  
  public sessionStore: any; // Session store
  
  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.budgets = new Map();
    this.receipts = new Map();
    this.insights = new Map();
    
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentBudgetId = 1;
    this.currentReceiptId = 1;
    this.currentInsightId = 1;
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    // Create a test user directly with a plain text password
    // This test user has ID 2 to avoid conflicts with the demo user
    const testUser: User = { 
      id: 2, 
      username: "testuser2", 
      password: "password123" 
    };
    this.users.set(testUser.id, testUser);
    this.currentUserId = 3; // Increment to avoid conflicts
    
    // Initialize with default categories
    this.initializeCategories();
    // Initialize with a default user
    this.initializeUser();
    // Initialize with sample data for demo
    this.initializeSampleData();
  }
  
  private initializeCategories() {
    const defaultCategories = [
      "Groceries", "Dining", "Utilities", "Transportation", 
      "Entertainment", "Shopping", "Health", "Travel", "Personal Care", "Others"
    ];
    
    defaultCategories.forEach((name) => {
      const id = this.currentCategoryId++;
      this.categories.set(id, { id, name });
    });
  }
  
  private initializeUser() {
    const id = this.currentUserId;
    // Using a pre-hashed password that matches "demo123" for the demo user
    const hashedPassword = "08d10d0b438428029d8d9f7b15c3e1515e817e56b33c87d26e37a8fb1c1c8f3c6a368ffa3792e2e8cd28b6af5f6f10e9a0342d54fe99c4bc208eb9e3c85e3966.84eb2f2b3fd3cb59a8efcd37e4f56b23";
    const user: User = { id, username: "demo", password: hashedPassword };
    this.users.set(id, user);
  }
  
  private initializeSampleData() {
    const userId = 1;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Initial budgets
    const sampleBudgets = [
      { userId, category: "Groceries", limit: "8000", month: currentMonth },
      { userId, category: "Dining", limit: "4000", month: currentMonth },
      { userId, category: "Utilities", limit: "5000", month: currentMonth },
      { userId, category: "Transportation", limit: "4000", month: currentMonth },
      { userId, category: "Entertainment", limit: "3000", month: currentMonth }
    ];
    
    sampleBudgets.forEach((budget) => {
      const id = this.currentBudgetId++;
      this.budgets.set(id, { id, ...budget });
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name === name
    );
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }
  
  // Budget methods
  async getBudgets(userId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.userId === userId
    );
  }
  
  async getBudgetsByMonth(userId: number, month: string): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.userId === userId && budget.month === month
    );
  }
  
  async getBudget(userId: number, category: string, month: string): Promise<Budget | undefined> {
    return Array.from(this.budgets.values()).find(
      (budget) => budget.userId === userId && budget.category === category && budget.month === month
    );
  }
  
  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const id = this.currentBudgetId++;
    const budget: Budget = { ...insertBudget, id };
    this.budgets.set(id, budget);
    return budget;
  }
  
  async updateBudget(id: number, limit: string): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    
    const updatedBudget = { ...budget, limit };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    return this.budgets.delete(id);
  }
  
  // Receipt methods
  async getReceipts(userId: number): Promise<Receipt[]> {
    return Array.from(this.receipts.values())
      .filter((receipt) => receipt.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getReceiptsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Receipt[]> {
    // Debug the date ranges
    console.log(`Searching for receipts between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    const receipts = Array.from(this.receipts.values())
      .filter((receipt) => {
        const receiptDate = new Date(receipt.date);
        
        // Debug receipt date comparisons
        console.log(`Receipt ${receipt.id} date: ${receiptDate.toISOString()}, userId: ${receipt.userId}, matches user: ${receipt.userId === userId}`);
        console.log(`Date comparison: >= ${startDate.toISOString()}: ${receiptDate >= startDate}, <= ${endDate.toISOString()}: ${receiptDate <= endDate}`);
        
        return (
          receipt.userId === userId &&
          receiptDate >= startDate &&
          receiptDate <= endDate
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    console.log(`Found ${receipts.length} receipts in date range`);
    return receipts;
  }
  
  async getReceipt(id: number): Promise<Receipt | undefined> {
    return this.receipts.get(id);
  }
  
  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const id = this.currentReceiptId++;
    // Ensure category is present, use default if not provided
    const category = insertReceipt.category || "Others";
    const receipt: Receipt = { 
      ...insertReceipt, 
      id,
      category 
    };
    this.receipts.set(id, receipt);
    return receipt;
  }
  
  async updateReceiptItem(receiptId: number, itemIndex: number, updates: Partial<ReceiptItem>): Promise<Receipt | undefined> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt || !receipt.items[itemIndex]) return undefined;
    
    const updatedItems = [...receipt.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
    
    const updatedReceipt = { ...receipt, items: updatedItems };
    this.receipts.set(receiptId, updatedReceipt);
    return updatedReceipt;
  }
  
  async deleteReceipt(id: number): Promise<boolean> {
    // Delete all insights related to this receipt
    const receiptIdStr = id.toString();
    Array.from(this.insights.values()).forEach(insight => {
      if (insight.relatedItemId === receiptIdStr) {
        this.insights.delete(insight.id);
      }
    });
    
    // Delete the receipt
    return this.receipts.delete(id);
  }
  
  // Insight methods
  async getInsights(userId: number): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter((insight) => insight.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getInsightsByType(userId: number, type: string): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter((insight) => insight.userId === userId && insight.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getInsight(id: number): Promise<Insight | undefined> {
    return this.insights.get(id);
  }
  
  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = this.currentInsightId++;
    const insight: Insight = { ...insertInsight, id };
    this.insights.set(id, insight);
    return insight;
  }
  
  async markInsightAsRead(id: number): Promise<Insight | undefined> {
    const insight = this.insights.get(id);
    if (!insight) return undefined;
    
    const updatedInsight = { ...insight, read: true };
    this.insights.set(id, updatedInsight);
    return updatedInsight;
  }
  
  // Stats methods
  async getStats(userId: number): Promise<Stats> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get all receipts for the current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const receipts = await this.getReceiptsByDateRange(userId, startOfMonth, endOfMonth);
    const budgets = await this.getBudgetsByMonth(userId, currentMonth);
    
    // Debug log the receipts we're calculating totals from
    console.log(`Calculating stats for user ${userId}, found ${receipts.length} receipts for current month`);
    if (receipts.length > 0) {
      console.log('Receipt totals:', receipts.map(r => ({
        id: r.id,
        merchantName: r.merchantName,
        total: r.total,
        totalType: typeof r.total,
        itemsCount: r.items?.length || 0
      })));
    }
    
    // Calculate total spend from receipts - properly handle invalid totals
    let totalSpend = 0;
    for (const receipt of receipts) {
      // First try to use the receipt total
      const receiptTotal = parseFloat(receipt.total);
      if (!isNaN(receiptTotal)) {
        console.log(`Adding receipt total: ${receiptTotal} from ${receipt.merchantName}`);
        totalSpend += receiptTotal;
      } else if (receipt.items && receipt.items.length > 0) {
        // If total is not valid, calculate from items
        const itemsTotal = receipt.items.reduce((sum, item) => {
          const itemPrice = typeof item.price === 'number' ? item.price : 0;
          return sum + itemPrice;
        }, 0);
        console.log(`Adding calculated items total: ${itemsTotal} from ${receipt.merchantName}`);
        totalSpend += itemsTotal;
      }
    }
    
    console.log(`Final total spend calculated: ${totalSpend}`);
    
    // Calculate budget total and remaining
    const budgetTotal = budgets.reduce((sum, budget) => sum + Number(budget.limit), 0);
    const budgetRemaining = Math.max(0, budgetTotal - totalSpend);
    
    // Count potential savings based on insights
    const savingsInsights = await this.getInsightsByType(userId, 'saving');
    const potentialSavings = savingsInsights.length * 150; // Approximation for demo
    
    // Count recurring expenses
    const recurringItems = receipts.flatMap(receipt => 
      receipt.items.filter(item => item.recurring)
    );
    const recurringTotal = recurringItems.reduce((sum, item) => {
      const itemPrice = typeof item.price === 'number' ? item.price : 0;
      return sum + itemPrice;
    }, 0);
    
    // Count unique subscriptions by name
    const subscriptionNames = new Set(
      recurringItems
        .filter(item => item.name.toLowerCase().includes('subscription') || 
                       item.name.toLowerCase().includes('netflix') ||
                       item.name.toLowerCase().includes('prime') ||
                       item.name.toLowerCase().includes('disney'))
        .map(item => item.name)
    );
    
    // Calculate spending trend (dummy value for demo)
    const spendingTrend = 12.5;
    
    // Create final stats object with proper numerical values
    const result = {
      totalSpend: Number(totalSpend.toFixed(2)),
      budgetRemaining: Number(budgetRemaining.toFixed(2)),
      potentialSavings: Number(potentialSavings.toFixed(2)),
      suggestionsCount: savingsInsights.length,
      recurringExpenses: Number(recurringTotal.toFixed(2)),
      subscriptionsCount: subscriptionNames.size,
      spendingTrend: Number(spendingTrend.toFixed(2))
    };
    
    console.log(`Returning stats for user ${userId}:`, result);
    
    return result;
  }
  
  async getBudgetStatuses(userId: number): Promise<BudgetStatus[]> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgets = await this.getBudgetsByMonth(userId, currentMonth);
    
    if (budgets.length === 0) {
      return [];
    }
    
    // Get receipts for current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const receipts = await this.getReceiptsByDateRange(userId, startOfMonth, endOfMonth);
    
    // Calculate spending by category
    const categorySpending: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      // First try to use receipt's primary category for all items if it exists
      if (receipt.category) {
        let receiptTotal = 0;
        
        // Try to use the receipt total first
        if (receipt.total && !isNaN(parseFloat(receipt.total))) {
          receiptTotal = parseFloat(receipt.total);
        } else if (receipt.items && receipt.items.length > 0) {
          // Or calculate from items
          receiptTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        
        categorySpending[receipt.category] = (categorySpending[receipt.category] || 0) + receiptTotal;
      } else if (receipt.items && receipt.items.length > 0) {
        // If no receipt category, use individual item categories
        receipt.items.forEach(item => {
          if (item.category) {
            categorySpending[item.category] = (categorySpending[item.category] || 0) + (item.price || 0);
          } else {
            // Default to Others category if no item category
            categorySpending['Others'] = (categorySpending['Others'] || 0) + (item.price || 0);
          }
        });
      }
    });
    
    // Create budget status for each budget
    return budgets.map(budget => {
      const spent = categorySpending[budget.category] || 0;
      const percentage = Math.min(100, Math.round((spent / Number(budget.limit)) * 100));
      
      let status: 'normal' | 'warning' | 'exceeded' = 'normal';
      if (percentage >= 100) {
        status = 'exceeded';
      } else if (percentage >= 80) {
        status = 'warning';
      }
      
      return {
        category: budget.category,
        spent,
        limit: Number(budget.limit),
        percentage,
        status
      };
    });
  }
  
  async getCategorySpending(userId: number): Promise<CategorySpending[]> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const receipts = await this.getReceiptsByDateRange(userId, startOfMonth, endOfMonth);
    
    // Define colors for categories
    const categoryColors: Record<string, string> = {
      'Groceries': '#3B82F6', // blue
      'Dining': '#EF4444', // red
      'Utilities': '#10B981', // green
      'Transportation': '#F59E0B', // amber
      'Entertainment': '#8B5CF6', // purple
      'Shopping': '#EC4899', // pink
      'Health': '#14B8A6', // teal
      'Travel': '#F97316', // orange
      'Personal Care': '#6366F1', // indigo
      'Others': '#6B7280', // gray
    };
    
    // Calculate spending by category
    const spending: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      // First try to use receipt's primary category for all items if it exists
      if (receipt.category) {
        let receiptTotal = 0;
        
        // Try to use the receipt total first
        if (receipt.total && !isNaN(parseFloat(receipt.total))) {
          receiptTotal = parseFloat(receipt.total);
        } else if (receipt.items && receipt.items.length > 0) {
          // Or calculate from items
          receiptTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        
        spending[receipt.category] = (spending[receipt.category] || 0) + receiptTotal;
      } else if (receipt.items && receipt.items.length > 0) {
        // If no receipt category, use individual item categories
        receipt.items.forEach(item => {
          if (item.category) {
            spending[item.category] = (spending[item.category] || 0) + (item.price || 0);
          } else {
            // Default to Others category if no item category
            spending['Others'] = (spending['Others'] || 0) + (item.price || 0);
          }
        });
      }
    });
    
    // Convert to array sorted by amount
    return Object.keys(spending)
      .map(category => ({
        category,
        amount: spending[category],
        color: categoryColors[category] || categoryColors['Others'] // Default color if category not found
      }))
      .sort((a, b) => b.amount - a.amount);
  }
  
  async getMonthlySpending(userId: number, months: number = 6): Promise<MonthlySpending[]> {
    const today = new Date();
    const result: MonthlySpending[] = [];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate data for the past N months
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const receipts = await this.getReceiptsByDateRange(
        userId, 
        new Date(month.getFullYear(), month.getMonth(), 1),
        endOfMonth
      );
      
      // Calculate total spend for the month and by category
      const categories: Record<string, number> = {};
      let totalAmount = 0;
      
      receipts.forEach(receipt => {
        let receiptTotal = 0;
        
        // Try to use receipt total first
        if (receipt.total && !isNaN(parseFloat(receipt.total))) {
          receiptTotal = parseFloat(receipt.total);
        } else if (receipt.items && receipt.items.length > 0) {
          // Calculate from items if total not available or valid
          receiptTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        
        totalAmount += receiptTotal;
        
        // Categorize spending
        if (receipt.category) {
          // Use receipt category if available
          categories[receipt.category] = (categories[receipt.category] || 0) + receiptTotal;
        } else if (receipt.items && receipt.items.length > 0) {
          // Otherwise use item categories
          receipt.items.forEach(item => {
            if (item.category) {
              categories[item.category] = (categories[item.category] || 0) + (item.price || 0);
            } else {
              // Default to Others
              categories['Others'] = (categories['Others'] || 0) + (item.price || 0);
            }
          });
        }
      });
      
      result.push({
        month: shortMonths[month.getMonth()],
        amount: totalAmount,
        categories
      });
    }
    
    return result;
  }
}

export class DatabaseStorage implements IStorage {
  public sessionStore: any; // Fix type issue with session.SessionStore

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [createdCategory] = await db.insert(categories).values(category).returning();
    return createdCategory;
  }

  async getBudgets(userId: number): Promise<Budget[]> {
    return db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async getBudgetsByMonth(userId: number, month: string): Promise<Budget[]> {
    return db.select().from(budgets).where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.month, month)
      )
    );
  }

  async getBudget(userId: number, category: string, month: string): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.category, category),
        eq(budgets.month, month)
      )
    );
    return budget || undefined;
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [createdBudget] = await db.insert(budgets).values(budget).returning();
    return createdBudget;
  }

  async updateBudget(id: number, limit: string): Promise<Budget | undefined> {
    const [updatedBudget] = await db
      .update(budgets)
      .set({ limit })
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget || undefined;
  }

  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return result.rowCount > 0;
  }

  async getReceipts(userId: number): Promise<Receipt[]> {
    return db.select().from(receipts)
      .where(eq(receipts.userId, userId))
      .orderBy(desc(receipts.date));
  }

  async getReceiptsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Receipt[]> {
    return db.select().from(receipts).where(
      and(
        eq(receipts.userId, userId),
        gte(receipts.date, startDate),
        lte(receipts.date, endDate)
      )
    ).orderBy(desc(receipts.date));
  }

  async getReceipt(id: number): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt || undefined;
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const [createdReceipt] = await db.insert(receipts).values(receipt).returning();
    return createdReceipt;
  }

  async updateReceiptItem(receiptId: number, itemIndex: number, updates: Partial<ReceiptItem>): Promise<Receipt | undefined> {
    // Get the receipt
    const receipt = await this.getReceipt(receiptId);
    if (!receipt || !receipt.items[itemIndex]) return undefined;

    // Update the item
    const updatedItems = [...receipt.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };

    // Update the receipt
    const [updatedReceipt] = await db
      .update(receipts)
      .set({ items: updatedItems })
      .where(eq(receipts.id, receiptId))
      .returning();
    
    return updatedReceipt || undefined;
  }

  async deleteReceipt(id: number): Promise<boolean> {
    // Delete related insights
    await db.delete(insights).where(eq(insights.relatedItemId, id.toString()));
    
    // Delete the receipt
    const result = await db.delete(receipts).where(eq(receipts.id, id));
    return result.rowCount > 0;
  }

  async getInsights(userId: number): Promise<Insight[]> {
    return db.select().from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.date));
  }

  async getInsightsByType(userId: number, type: string): Promise<Insight[]> {
    return db.select().from(insights).where(
      and(
        eq(insights.userId, userId),
        eq(insights.type, type)
      )
    ).orderBy(desc(insights.date));
  }

  async getInsight(id: number): Promise<Insight | undefined> {
    const [insight] = await db.select().from(insights).where(eq(insights.id, id));
    return insight || undefined;
  }

  async createInsight(insight: InsertInsight): Promise<Insight> {
    const [createdInsight] = await db.insert(insights).values(insight).returning();
    return createdInsight;
  }

  async markInsightAsRead(id: number): Promise<Insight | undefined> {
    const [updatedInsight] = await db
      .update(insights)
      .set({ read: true })
      .where(eq(insights.id, id))
      .returning();
    return updatedInsight || undefined;
  }

  async getStats(userId: number): Promise<Stats> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get all receipts for the current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const receipts = await this.getReceiptsByDateRange(userId, startOfMonth, endOfMonth);
    const budgets = await this.getBudgetsByMonth(userId, currentMonth);
    
    // Calculate total spend from receipts - properly handle invalid totals
    let totalSpend = 0;
    for (const receipt of receipts) {
      // First try to use the receipt total
      const receiptTotal = parseFloat(receipt.total);
      if (!isNaN(receiptTotal)) {
        totalSpend += receiptTotal;
      } else if (receipt.items && receipt.items.length > 0) {
        // If total is not valid, calculate from items
        const itemsTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        totalSpend += itemsTotal;
      }
    }
    
    // Calculate budget total and remaining
    const budgetTotal = budgets.reduce((sum, budget) => sum + Number(budget.limit), 0);
    const budgetRemaining = Math.max(0, budgetTotal - totalSpend);
    
    // Count potential savings based on insights
    const savingsInsights = await this.getInsightsByType(userId, 'saving');
    const potentialSavings = savingsInsights.length * 150; // Approximation for demo
    
    // Count recurring expenses
    const recurringItems = receipts.flatMap(receipt => 
      receipt.items.filter(item => item.recurring)
    );
    const recurringTotal = recurringItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    // Count unique subscriptions by name
    const subscriptionNames = new Set(
      recurringItems
        .filter(item => item.name.toLowerCase().includes('subscription') || 
                       item.name.toLowerCase().includes('netflix') ||
                       item.name.toLowerCase().includes('prime') ||
                       item.name.toLowerCase().includes('disney'))
        .map(item => item.name)
    );
    
    // Calculate spending trend (dummy value for demo)
    const spendingTrend = 12.5;
    
    return {
      totalSpend,
      budgetRemaining,
      potentialSavings,
      suggestionsCount: savingsInsights.length,
      recurringExpenses: recurringTotal,
      subscriptionsCount: subscriptionNames.size,
      spendingTrend
    };
  }

  async getBudgetStatuses(userId: number): Promise<BudgetStatus[]> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgets = await this.getBudgetsByMonth(userId, currentMonth);
    
    if (budgets.length === 0) {
      return [];
    }
    
    // Get receipts for current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const receipts = await this.getReceiptsByDateRange(userId, startOfMonth, endOfMonth);
    
    // Calculate spending by category
    const categorySpending: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      // First try to use receipt's primary category for all items if it exists
      if (receipt.category) {
        let receiptTotal = 0;
        
        // Try to use the receipt total first
        if (receipt.total && !isNaN(parseFloat(receipt.total))) {
          receiptTotal = parseFloat(receipt.total);
        } else if (receipt.items && receipt.items.length > 0) {
          // Or calculate from items
          receiptTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        
        categorySpending[receipt.category] = (categorySpending[receipt.category] || 0) + receiptTotal;
      } else if (receipt.items && receipt.items.length > 0) {
        // If no receipt category, use individual item categories
        receipt.items.forEach(item => {
          if (item.category) {
            categorySpending[item.category] = (categorySpending[item.category] || 0) + (item.price || 0);
          } else {
            // Default to Others category if no item category
            categorySpending['Others'] = (categorySpending['Others'] || 0) + (item.price || 0);
          }
        });
      }
    });
    
    // Create budget status for each budget
    return budgets.map(budget => {
      const spent = categorySpending[budget.category] || 0;
      const percentage = Math.min(100, Math.round((spent / Number(budget.limit)) * 100));
      
      let status: 'normal' | 'warning' | 'exceeded' = 'normal';
      if (percentage >= 100) {
        status = 'exceeded';
      } else if (percentage >= 80) {
        status = 'warning';
      }
      
      return {
        category: budget.category,
        spent,
        limit: Number(budget.limit),
        percentage,
        status
      };
    });
  }

  async getCategorySpending(userId: number): Promise<CategorySpending[]> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const receipts = await this.getReceiptsByDateRange(userId, startOfMonth, endOfMonth);
    
    // Define colors for categories
    const categoryColors: Record<string, string> = {
      'Groceries': '#3B82F6', // blue
      'Dining': '#EF4444', // red
      'Utilities': '#10B981', // green
      'Transportation': '#F59E0B', // amber
      'Entertainment': '#8B5CF6', // purple
      'Shopping': '#EC4899', // pink
      'Health': '#14B8A6', // teal
      'Travel': '#F97316', // orange
      'Personal Care': '#6366F1', // indigo
      'Others': '#6B7280', // gray
    };
    
    // Calculate spending by category
    const spending: Record<string, number> = {};
    
    receipts.forEach(receipt => {
      // First try to use receipt's primary category for all items if it exists
      if (receipt.category) {
        let receiptTotal = 0;
        
        // Try to use the receipt total first
        if (receipt.total && !isNaN(parseFloat(receipt.total))) {
          receiptTotal = parseFloat(receipt.total);
        } else if (receipt.items && receipt.items.length > 0) {
          // Or calculate from items
          receiptTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        
        spending[receipt.category] = (spending[receipt.category] || 0) + receiptTotal;
      } else if (receipt.items && receipt.items.length > 0) {
        // If no receipt category, use individual item categories
        receipt.items.forEach(item => {
          if (item.category) {
            spending[item.category] = (spending[item.category] || 0) + (item.price || 0);
          } else {
            // Default to Others category if no item category
            spending['Others'] = (spending['Others'] || 0) + (item.price || 0);
          }
        });
      }
    });
    
    // Convert to array sorted by amount
    return Object.keys(spending)
      .map(category => ({
        category,
        amount: spending[category],
        color: categoryColors[category] || categoryColors['Others'] // Default color if category not found
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  async getMonthlySpending(userId: number, months: number = 6): Promise<MonthlySpending[]> {
    const today = new Date();
    const result: MonthlySpending[] = [];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate data for the past N months
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const receipts = await this.getReceiptsByDateRange(
        userId, 
        new Date(month.getFullYear(), month.getMonth(), 1),
        endOfMonth
      );
      
      // Calculate total spend for the month and by category
      const categories: Record<string, number> = {};
      let totalAmount = 0;
      
      receipts.forEach(receipt => {
        let receiptTotal = 0;
        
        // Try to use receipt total first
        if (receipt.total && !isNaN(parseFloat(receipt.total))) {
          receiptTotal = parseFloat(receipt.total);
        } else if (receipt.items && receipt.items.length > 0) {
          // Calculate from items if total not available or valid
          receiptTotal = receipt.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        
        totalAmount += receiptTotal;
        
        // Categorize spending
        if (receipt.category) {
          // Use receipt category if available
          categories[receipt.category] = (categories[receipt.category] || 0) + receiptTotal;
        } else if (receipt.items && receipt.items.length > 0) {
          // Otherwise use item categories
          receipt.items.forEach(item => {
            if (item.category) {
              categories[item.category] = (categories[item.category] || 0) + (item.price || 0);
            } else {
              // Default to Others
              categories['Others'] = (categories['Others'] || 0) + (item.price || 0);
            }
          });
        }
      });
      
      result.push({
        month: shortMonths[month.getMonth()],
        amount: totalAmount,
        categories
      });
    }
    
    return result;
  }
}

export const storage = new MemStorage();