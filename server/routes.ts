import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import schedule from "node-schedule";
import multer from 'multer';
import { categorizeItems, generateInsight, generateSavingsSuggestion, detectRecurring, generateWeeklyDigest, processReceiptImage } from "./ai";
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
      const userId = 1; // Using default user for demo
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      
      const budgets = await storage.getBudgetsByMonth(userId, month);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });
  
  app.post("/api/budgets", async (req: Request, res: Response) => {
    try {
      const budgetSchema = z.object({
        category: z.string(),
        limit: z.number().positive(),
        month: z.string().regex(/^\d{4}-\d{2}$/) // YYYY-MM format
      });
      
      const validatedData = budgetSchema.parse(req.body);
      const userId = 1; // Using default user for demo
      
      // Check if budget already exists for this category and month
      const existingBudget = await storage.getBudget(userId, validatedData.category, validatedData.month);
      
      if (existingBudget) {
        // Update existing budget
        const updatedBudget = await storage.updateBudget(existingBudget.id, validatedData.limit);
        res.json(updatedBudget);
      } else {
        // Create new budget
        const newBudget = await storage.createBudget({
          userId,
          ...validatedData
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
      const id = parseInt(req.params.id);
      const limit = parseFloat(req.body.limit);
      
      if (isNaN(id) || isNaN(limit) || limit <= 0) {
        return res.status(400).json({ message: "Invalid id or limit" });
      }
      
      const updatedBudget = await storage.updateBudget(id, limit);
      
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
      const userId = 1; // Using default user for demo
      
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
  
  app.post("/api/receipts/upload", upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert file buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    
    // Process the image using OCR and GPT
    const extractedData = await processReceiptImage(base64Image);
    
    res.json(extractedData);
  } catch (error) {
    res.status(500).json({ message: "Failed to process receipt" });
  }
});

app.post("/api/receipts", async (req: Request, res: Response) => {
    try {
      const receiptSchema = z.object({
        merchantName: z.string(),
        date: z.string().transform(str => new Date(str)),
        total: z.number().positive(),
        items: z.array(z.object({
          name: z.string(),
          price: z.number().positive()
        }))
      });
      
      const validatedData = receiptSchema.parse(req.body);
      const userId = 1; // Using default user for demo
      
      // Use AI to categorize items
      const itemsWithCategories = await categorizeItems(validatedData.items);
      
      // Create receipt with categorized items
      const newReceipt = await storage.createReceipt({
        userId,
        merchantName: validatedData.merchantName,
        date: validatedData.date,
        total: validatedData.total,
        items: itemsWithCategories
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
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const userId = 1; // Using default user for demo
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  
  app.get("/api/stats/budget-status", async (_req: Request, res: Response) => {
    try {
      const userId = 1; // Using default user for demo
      const budgetStatuses = await storage.getBudgetStatuses(userId);
      res.json(budgetStatuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budget statuses" });
    }
  });
  
  app.get("/api/stats/category-spending", async (_req: Request, res: Response) => {
    try {
      const userId = 1; // Using default user for demo
      const categorySpending = await storage.getCategorySpending(userId);
      res.json(categorySpending);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category spending" });
    }
  });
  
  app.get("/api/stats/monthly-spending", async (req: Request, res: Response) => {
    try {
      const userId = 1; // Using default user for demo
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
      const userId = 1; // Using default user for demo
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
  
  // Schedule weekly digest generation (every Sunday at 6 PM)
  schedule.scheduleJob('0 18 * * 0', async () => {
    try {
      const userId = 1; // Using default user for demo
      
      // Get receipts from the past week
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const receipts = await storage.getReceiptsByDateRange(userId, lastWeek, today);
      
      if (receipts.length > 0) {
        // Generate weekly digest
        const digest = await generateWeeklyDigest(userId, receipts);
        
        // Create insight from digest
        await storage.createInsight({
          userId,
          content: digest,
          type: 'digest',
          date: new Date(),
          read: false,
          relatedItemId: null
        });
      }
    } catch (error) {
      console.error("Failed to generate weekly digest:", error);
    }
  });
  
  // Helper function to process receipt items in the background
  async function processReceiptItems(receiptId: number, items: any[]) {
    try {
      const receipt = await storage.getReceipt(receiptId);
      if (!receipt) return;
      
      const userId = receipt.userId;
      
      // Process each item in the receipt
      for (let i = 0; i < items.length; i++) {
        // Detect recurring items
        const isRecurring = await detectRecurring(items[i].name);
        
        if (isRecurring) {
          await storage.updateReceiptItem(receiptId, i, { recurring: true });
          
          // Create insight for recurring item
          await storage.createInsight({
            userId,
            content: `${items[i].name} appears to be a recurring expense. Consider reviewing this subscription.`,
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
      
      // Generate generic insight for the whole receipt
      const insight = await generateInsight(receipt);
      
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
