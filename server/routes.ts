import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import schedule from "node-schedule";
import multer from 'multer';
import { 
  categorizeItems, 
  generateInsight, 
  generateSavingsSuggestion, 
  detectRecurring, 
  generateWeeklyDigest, 
  processReceiptImage,
  analyzeSpendingPatterns,
  detectRecurringExpenses,
  generateAdvancedInsights
} from "./ai";
import { setupAuth } from "./auth";

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  const httpServer = createServer(app);
  
  // Define API routes with /api prefix
  
  // Categories endpoints
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  // Budgets endpoints
  app.get("/api/budgets", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      
      const budgets = await storage.getBudgetsByMonth(userId, month);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });
  
  app.post("/api/budgets", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const budgetSchema = z.object({
        category: z.string(),
        limit: z.number().positive(),
        month: z.string().regex(/^\d{4}-\d{2}$/) // YYYY-MM format
      });
      
      const validatedData = budgetSchema.parse(req.body);
      const userId = req.user.id;
      
      // Check if budget already exists for this category and month
      const existingBudget = await storage.getBudget(userId, validatedData.category, validatedData.month);
      
      if (existingBudget) {
        // Update existing budget
        const updatedBudget = await storage.updateBudget(existingBudget.id, validatedData.limit.toString());
        res.json(updatedBudget);
      } else {
        // Create new budget
        const newBudget = await storage.createBudget({
          userId,
          category: validatedData.category,
          month: validatedData.month,
          limit: validatedData.limit.toString()
        });
        res.json(newBudget);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create/update budget" });
      }
    }
  });
  
  app.put("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      const limit = parseFloat(req.body.limit);
      
      if (isNaN(id) || isNaN(limit) || limit <= 0) {
        return res.status(400).json({ message: "Invalid id or limit" });
      }
      
      const updatedBudget = await storage.updateBudget(id, limit.toString());
      
      if (!updatedBudget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.json(updatedBudget);
    } catch (error) {
      res.status(500).json({ message: "Failed to update budget" });
    }
  });
  
  app.delete("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }
      
      const deleted = await storage.deleteBudget(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });
  
  // Receipts endpoints
  app.get("/api/receipts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.id;
      
      // Optional date range filters
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
      }
      
      let receipts;
      
      if (startDate && endDate) {
        receipts = await storage.getReceiptsByDateRange(userId, startDate, endDate);
      } else {
        receipts = await storage.getReceipts(userId);
      }
      
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });
  
  app.get("/api/receipts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid receipt id" });
      }
      
      const receipt = await storage.getReceipt(id);
      
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch receipt" });
    }
  });
  
  // Endpoint to delete a receipt
  app.delete("/api/receipts/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid receipt id" });
      }
      
      // Check if the receipt exists and belongs to the user
      const receipt = await storage.getReceipt(id);
      
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      if (receipt.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have permission to delete this receipt" });
      }
      
      // Delete the receipt
      const deleted = await storage.deleteReceipt(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete receipt" });
      }
      
      res.json({ success: true, message: "Receipt deleted successfully" });
    } catch (error) {
      console.error("Error deleting receipt:", error);
      res.status(500).json({ message: "Failed to delete receipt" });
    }
  });
  
  app.post("/api/receipts/upload", upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert file buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    
    // Process the image using enhanced OCR and GPT with currency detection
    console.log("Processing receipt image with OpenAI...");
    const extractedData = await processReceiptImage(base64Image);
    
    let suggestedCategory = extractedData.category || "Others";
    
    // If items are available, try to categorize based on them
    if (extractedData.items && extractedData.items.length > 0) {
      // Get categories for individual items
      const categorizedItems = await categorizeItems(extractedData.items);
      extractedData.items = categorizedItems;
      
      // Determine the most frequent category among items
      const categoryCounts: Record<string, number> = {};
      categorizedItems.forEach(item => {
        if (item.category && item.category !== "Others") {
          const safeCategory = String(item.category);
          categoryCounts[safeCategory] = (categoryCounts[safeCategory] || 0) + 1;
        }
      });
      
      // Find the most common category (excluding "Others")
      let maxCount = 0;
      Object.entries(categoryCounts).forEach(([category, count]) => {
        if (count > maxCount) {
          maxCount = count;
          suggestedCategory = category;
        }
      });
    }
    
    // Add additional context for the client
    const enhancedResponse = {
      ...extractedData,
      items: extractedData.items,
      category: suggestedCategory, // Add suggested category for the receipt
      processingMethod: "gpt-4o with enhanced categorization",
      detectionConfidence: "high",
      originalFilename: req.file.originalname || "unknown"
    };
    
    res.json(enhancedResponse);
  } catch (error) {
    console.error("Error processing receipt upload:", error);
    res.status(500).json({ message: "Failed to process receipt", error: (error as Error).message });
  }
});

// Endpoint for processing receipt image from base64 string
app.post("/api/process-receipt-image", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const { image } = req.body;
    
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ message: "Invalid image data" });
    }
    
    // Process the image using enhanced OCR and GPT with currency detection
    console.log("Processing receipt image with OpenAI...");
    const extractedData = await processReceiptImage(image);
    
    // Auto-categorize the receipt based on merchant and items
    let suggestedCategory = "Others";
    
    // If items are available, try to categorize based on them
    if (extractedData.items && extractedData.items.length > 0) {
      // Get categories for individual items
      const categorizedItems = await categorizeItems(extractedData.items);
      extractedData.items = categorizedItems;
      
      // Determine the most frequent category among items
      const categoryCounts: Record<string, number> = {};
      categorizedItems.forEach(item => {
        if (item.category) {
          // Ensure category is a sanitized string to prevent JSON parsing issues
          const safeCategory = String(item.category);
          categoryCounts[safeCategory] = (categoryCounts[safeCategory] || 0) + 1;
        }
      });
      
      // Find the most common category
      let maxCount = 0;
      Object.entries(categoryCounts).forEach(([category, count]) => {
        if (count > maxCount) {
          maxCount = count;
          suggestedCategory = category;
        }
      });
    }
    
    // Add additional context for better user experience
    const enhancedResponse = {
      ...extractedData,
      items: extractedData.items,
      category: suggestedCategory, // Add suggested category for the receipt
      processingMethod: "gpt-4o with enhanced categorization",
      detectionConfidence: "high"
    };
    
    res.json(enhancedResponse);
  } catch (error) {
    console.error("Error processing receipt image:", error);
    res.status(500).json({ 
      message: "Failed to process receipt image", 
      error: (error as Error).message 
    });
  }
});

app.post("/api/receipts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const receiptSchema = z.object({
        merchantName: z.string(),
        date: z.union([
          z.string().transform(str => new Date(str)),
          z.date()
        ]),
        total: z.union([
          z.number().positive(),
          z.string().transform(str => {
            const num = parseFloat(str);
            if (isNaN(num) || num <= 0) throw new Error('Total must be a positive number');
            return num;
          })
        ]),
        items: z.array(z.object({
          name: z.string(),
          price: z.union([
            z.number().positive(),
            z.string().transform(str => {
              const num = parseFloat(str);
              if (isNaN(num) || num <= 0) throw new Error('Price must be a positive number');
              return num;
            })
          ])
        })),
        currency: z.string().optional(),
        category: z.string().optional()
      });
      
      const validatedData = receiptSchema.parse(req.body);
      const userId = req.user.id;
      
      // Use AI to categorize items
      const itemsWithCategories = await categorizeItems(validatedData.items);
      
      // Add currency information to items if available
      if (validatedData.currency) {
        console.log(`Receipt using currency: ${validatedData.currency}`);
      }
      
      // Use provided category or determine most common category from items
      let receiptCategory = validatedData.category || "Others";
      
      if (!validatedData.category) {
        // Count categories to determine the most common one
        const categoryCounts: Record<string, number> = {};
        itemsWithCategories.forEach(item => {
          if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
          }
        });
        
        // Find the most common category (excluding "Others")
        let maxCount = 0;
        Object.entries(categoryCounts).forEach(([category, count]) => {
          // Prioritize actual categories over "Others"
          if ((category !== "Others" && count > maxCount) || 
              (category !== "Others" && count === maxCount) || 
              (category === "Others" && count > maxCount && !receiptCategory)) {
            maxCount = count;
            receiptCategory = category;
          }
        });
      }
      
      // Create receipt with categorized items and receipt level category
      const newReceipt = await storage.createReceipt({
        userId,
        merchantName: validatedData.merchantName,
        date: validatedData.date,
        total: validatedData.total.toString(),
        items: itemsWithCategories,
        category: receiptCategory // Add receipt-level category
      });
      
      // Process receipt items in the background
      processReceiptItems(newReceipt.id, newReceipt.items);
      
      res.json(newReceipt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid receipt data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create receipt" });
      }
    }
  });
  
  // Stats endpoints
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  
  app.get("/api/stats/budget-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const budgetStatuses = await storage.getBudgetStatuses(userId);
      res.json(budgetStatuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budget statuses" });
    }
  });
  
  app.get("/api/stats/category-spending", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const categorySpending = await storage.getCategorySpending(userId);
      res.json(categorySpending);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category spending" });
    }
  });
  
  app.get("/api/stats/monthly-spending", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const months = req.query.months ? parseInt(req.query.months as string) : 6;
      
      const monthlySpending = await storage.getMonthlySpending(userId, months);
      res.json(monthlySpending);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly spending" });
    }
  });
  
  // Insights endpoints
  app.get("/api/insights", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const type = req.query.type as string;
      
      let insights;
      
      if (type) {
        insights = await storage.getInsightsByType(userId, type);
      } else {
        insights = await storage.getInsights(userId);
      }
      
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });
  
  app.put("/api/insights/:id/read", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid insight id" });
      }
      
      const updatedInsight = await storage.markInsightAsRead(id);
      
      if (!updatedInsight) {
        return res.status(404).json({ message: "Insight not found" });
      }
      
      res.json(updatedInsight);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark insight as read" });
    }
  });
  
  // Generate advanced AI insights on demand
  app.post("/api/insights/generate", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      
      // Get all receipts for analysis
      const receipts = await storage.getReceipts(userId);
      
      if (receipts.length === 0) {
        return res.status(200).json({ 
          message: "Not enough data to generate insights",
          insights: []
        });
      }
      
      // Generate advanced insights
      const insights = await generateAdvancedInsights(userId, receipts);
      
      // Store the insights in the database
      const storedInsights = [];
      for (const insight of insights) {
        const storedInsight = await storage.createInsight(insight);
        storedInsights.push(storedInsight);
      }
      
      res.status(200).json({ 
        message: `Generated ${storedInsights.length} new insights`,
        insights: storedInsights
      });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });
  
  // Get spending patterns analysis
  app.get("/api/insights/spending-patterns", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      
      // Get all receipts for analysis
      const receipts = await storage.getReceipts(userId);
      
      if (receipts.length === 0) {
        return res.status(200).json({ 
          message: "Not enough data to analyze spending patterns",
          patterns: {
            patterns: [],
            frequentMerchants: [],
            categoryTrends: [],
            unusualSpending: []
          }
        });
      }
      
      // Analyze spending patterns
      const patterns = await analyzeSpendingPatterns(receipts);
      
      res.status(200).json({ patterns });
    } catch (error) {
      console.error("Error analyzing spending patterns:", error);
      res.status(500).json({ message: "Failed to analyze spending patterns" });
    }
  });
  
  // Get recurring expenses analysis
  app.get("/api/insights/recurring-expenses", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      
      // Get all receipts for analysis
      const receipts = await storage.getReceipts(userId);
      
      if (receipts.length < 2) {
        return res.status(200).json({ 
          message: "Not enough data to detect recurring expenses",
          recurringExpenses: []
        });
      }
      
      // Detect recurring expenses
      const recurringExpenses = await detectRecurringExpenses(receipts);
      
      res.status(200).json({ recurringExpenses });
    } catch (error) {
      console.error("Error detecting recurring expenses:", error);
      res.status(500).json({ message: "Failed to detect recurring expenses" });
    }
  });
  
  // Schedule weekly digest generation (every Sunday at 6 PM)
  schedule.scheduleJob('0 18 * * 0', async () => {
    try {
      // In real production this would be for all users, but we'll use demo user
      const userId = 1; // Using default user for demo
      
      // Get all receipts for a comprehensive analysis
      const allReceipts = await storage.getReceipts(userId);
      
      // Get receipts from just the past week for the weekly digest
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const weeklyReceipts = await storage.getReceiptsByDateRange(userId, lastWeek, today);
      
      if (weeklyReceipts.length > 0) {
        // Generate enhanced weekly digest with pattern analysis
        const digest = await generateWeeklyDigest(userId, weeklyReceipts);
        
        // Create insight from digest
        await storage.createInsight({
          userId,
          content: digest,
          type: 'digest',
          date: new Date(),
          read: false,
          relatedItemId: null
        });
        
        // Also generate advanced insights once a week
        if (allReceipts.length > 0) {
          const advancedInsights = await generateAdvancedInsights(userId, allReceipts);
          
          // Store the insights
          for (const insightData of advancedInsights) {
            await storage.createInsight(insightData);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate weekly digest and insights:", error);
    }
  });
  
  // Helper function to process receipt items in the background
  async function processReceiptItems(receiptId: number, items: any[]) {
    try {
      const receipt = await storage.getReceipt(receiptId);
      if (!receipt) return;
      
      const userId = receipt.userId;
      
      // Process items in batches for categorization
      const itemsWithCategories = await categorizeItems(items);
      
      // Keep track of user-defined categories vs. AI-suggested ones
      const categoryChanges: Record<string, number> = {};
      const receiptCategory = receipt.category || "Others";
      
      // Process each item in the receipt
      for (let i = 0; i < itemsWithCategories.length && i < items.length; i++) {
        const item = itemsWithCategories[i];
        
        // Apply category if detected and it's not the default "Others"
        if (item.category && item.category !== "Others") {
          await storage.updateReceiptItem(receiptId, i, { category: item.category });
          
          // Track category changes for potential receipt category updates
          categoryChanges[item.category] = (categoryChanges[item.category] || 0) + 1;
        } else if (receiptCategory && receiptCategory !== "Others") {
          // Apply receipt-level category if no specific category detected
          await storage.updateReceiptItem(receiptId, i, { category: receiptCategory });
        }
        
        // Detect recurring items
        const isRecurring = await detectRecurring(item.name);
        
        if (isRecurring) {
          await storage.updateReceiptItem(receiptId, i, { recurring: true });
          
          // Create insight for recurring item
          await storage.createInsight({
            userId,
            content: `${item.name} appears to be a recurring expense. Consider reviewing this subscription.`,
            type: 'recurring',
            date: new Date(),
            read: false,
            relatedItemId: receiptId.toString()
          });
        }
        
        // Generate savings suggestion
        const suggestion = await generateSavingsSuggestion(items[i].name, items[i].price);
        
        if (suggestion) {
          await storage.updateReceiptItem(receiptId, i, { gptInsight: suggestion });
          
          // Create insight for saving suggestion
          await storage.createInsight({
            userId,
            content: suggestion,
            type: 'saving',
            date: new Date(),
            read: false,
            relatedItemId: receiptId.toString()
          });
        }
      }
      
      // Get previous receipts for enhanced insight generation
      const previousReceipts = await storage.getReceipts(userId);
      
      // Generate enhanced insight for the whole receipt with comparison to previous receipts
      const insight = await generateInsight(receipt, previousReceipts.filter(r => r.id !== receiptId));
      
      if (insight) {
        await storage.createInsight({
          userId,
          content: insight,
          type: 'general',
          date: new Date(),
          read: false,
          relatedItemId: receiptId.toString()
        });
      }
      
      // Periodically generate advanced insights (every 5th receipt)
      if (previousReceipts.length % 5 === 0) {
        try {
          // Generate advanced insights based on all receipts
          const advancedInsights = await generateAdvancedInsights(userId, previousReceipts);
          
          // Store the insights
          for (const insightData of advancedInsights) {
            await storage.createInsight(insightData);
          }
        } catch (insightError) {
          console.error("Error generating advanced insights:", insightError);
        }
      }
      
      // Check budget status and create alerts if needed
      const budgetStatuses = await storage.getBudgetStatuses(userId);
      
      for (const status of budgetStatuses) {
        if (status.status === 'warning') {
          await storage.createInsight({
            userId,
            content: `You've used ${status.percentage}% of your ${status.category} budget (₹${status.spent.toFixed(2)}/₹${status.limit.toFixed(2)}). Consider limiting your spending in this category.`,
            type: 'budget-alert',
            date: new Date(),
            read: false,
            relatedItemId: null
          });
        } else if (status.status === 'exceeded') {
          await storage.createInsight({
            userId,
            content: `You've exceeded your ${status.category} budget by ₹${(status.spent - status.limit).toFixed(2)}. It's recommended to adjust your budget or reduce spending in this category.`,
            type: 'budget-alert',
            date: new Date(),
            read: false,
            relatedItemId: null
          });
        }
      }
    } catch (error) {
      console.error("Failed to process receipt items:", error);
    }
  }
  
  return httpServer;
}
