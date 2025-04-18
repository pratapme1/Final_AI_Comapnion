import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import { 
  categorizeItems, 
  processReceiptImage, 
  detectRecurring, 
  generateInsight, 
  generateAdvancedInsights, 
  analyzeSpendingPatterns,
  detectRecurringExpenses
} from "./ai";
import { setupAuth } from "./auth";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
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
      const month = req.query.month as string;
      
      let budgets;
      if (month) {
        budgets = await storage.getBudgetsByMonth(userId, month);
      } else {
        budgets = await storage.getBudgets(userId);
      }
      
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
        limit: z.union([
          z.number().positive(),
          z.string().transform(str => {
            const num = parseFloat(str);
            if (isNaN(num) || num <= 0) throw new Error('Limit must be a positive number');
            return num.toString();
          })
        ]),
        month: z.string()
      });
      
      const validatedData = budgetSchema.parse(req.body);
      const userId = req.user.id;
      
      // Check if budget for this category and month already exists
      const existingBudget = await storage.getBudget(userId, validatedData.category, validatedData.month);
      
      if (existingBudget) {
        return res.status(400).json({ message: "Budget for this category and month already exists" });
      }
      
      const newBudget = await storage.createBudget({
        userId,
        category: validatedData.category,
        limit: typeof validatedData.limit === 'number' ? validatedData.limit.toString() : validatedData.limit,
        month: validatedData.month
      });
      
      res.status(201).json(newBudget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid budget id" });
      }
      
      const limitSchema = z.union([
        z.number().positive(),
        z.string().transform(str => {
          const num = parseFloat(str);
          if (isNaN(num) || num <= 0) throw new Error('Limit must be a positive number');
          return num.toString();
        })
      ]);
      
      const limit = limitSchema.parse(req.body.limit);
      
      const updatedBudget = await storage.updateBudget(id, typeof limit === 'number' ? limit.toString() : limit);
      
      if (!updatedBudget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.json(updatedBudget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid budget id" });
      }
      
      const success = await storage.deleteBudget(id);
      
      if (!success) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.status(204).end();
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
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
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

  app.delete("/api/receipts/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid receipt id" });
      }
      
      const success = await storage.deleteReceipt(id);
      
      if (!success) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete receipt" });
    }
  });

  // File upload endpoint for receipt
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
      
      // Process the image using OpenAI
      console.log("Processing receipt image with base64 data...");
      const extractedData = await processReceiptImage(image);
      
      // Handle problematic merchant names
      if (typeof extractedData.merchantName === 'string' && extractedData.merchantName.includes('Shell sai')) {
        console.log("Detected problematic merchant name, sanitizing...");
        extractedData.merchantName = "Shell Gas Station";
      }
      
      res.json(extractedData);
    } catch (error) {
      console.error("Error processing receipt image:", error);
      res.status(500).json({ 
        message: "Failed to process receipt image",
        error: error instanceof Error ? error.message : "Unknown error"
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
          ]),
          category: z.string().optional()
        })),
        category: z.string().optional()
      });
      
      const validatedData = receiptSchema.parse(req.body);
      const userId = req.user.id;
      
      // Create receipt with validated data
      const newReceipt = await storage.createReceipt({
        userId,
        merchantName: validatedData.merchantName,
        date: validatedData.date,
        total: validatedData.total.toString(),
        items: validatedData.items,
        category: validatedData.category || "Others"
      });
      
      // Process receipt items in the background
      setTimeout(() => {
        try {
          processReceiptItems(newReceipt.id, newReceipt.items, userId);
        } catch (error) {
          console.error("Error processing receipt items in background:", error);
        }
      }, 100);
      
      res.status(201).json(newReceipt);
    } catch (error) {
      console.error("Error creating receipt:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid receipt data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create receipt" });
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
      const months = parseInt(req.query.months as string) || 6;
      
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

  app.get("/api/insights/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid insight id" });
      }
      
      const insight = await storage.getInsight(id);
      
      if (!insight) {
        return res.status(404).json({ message: "Insight not found" });
      }
      
      res.json(insight);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch insight" });
    }
  });

  app.post("/api/insights/mark-read/:id", async (req: Request, res: Response) => {
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

  app.post("/api/generate-insights", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const receipts = await storage.getReceipts(userId);
      
      if (receipts.length === 0) {
        return res.status(404).json({ message: "No receipts found" });
      }
      
      // Analyze spending patterns first
      const patterns = await analyzeSpendingPatterns(receipts);
      
      // Detect recurring expenses
      const recurring = await detectRecurringExpenses(receipts);
      
      // Generate insights based on analyses
      const insights = await generateAdvancedInsights(userId, receipts);
      
      // Save insights to database
      const savedInsights = [];
      for (const insight of insights) {
        const savedInsight = await storage.createInsight(insight);
        savedInsights.push(savedInsight);
      }
      
      res.json({
        message: "Generated insights",
        count: savedInsights.length,
        insights: savedInsights,
        patterns,
        recurring
      });
    } catch (error) {
      console.error("Failed to generate insights:", error);
      res.status(500).json({ message: "Failed to generate insights", error: (error as Error).message });
    }
  });

  // Set up http server
  const httpServer = createServer(app);
  
  // Helper function for processing receipt items in the background
  async function processReceiptItems(receiptId: number, items: any[], userId: number) {
    try {
      // Get all previous receipts for this user for context
      const previousReceipts = await storage.getReceipts(userId);
      
      // Process items for categorization and recurring detection
      const itemsWithCategories = await categorizeItems(items);
      
      // Update receipt items with categorization
      for (let i = 0; i < itemsWithCategories.length; i++) {
        const item = itemsWithCategories[i];
        if (item.category && item.category !== "Others") {
          await storage.updateReceiptItem(receiptId, i, { category: item.category });
        }
        
        // Detect if item is recurring
        const isRecurring = await detectRecurring(item.name);
        if (isRecurring) {
          await storage.updateReceiptItem(receiptId, i, { recurring: true });
        }
      }
      
      // Generate insight for the receipt
      const receipt = await storage.getReceipt(receiptId);
      if (receipt) {
        const insight = await generateInsight(receipt, previousReceipts);
        
        if (insight) {
          await storage.createInsight({
            userId,
            type: "receipt",
            content: insight,
            date: new Date(),
            read: false,
            relatedItemId: receiptId.toString()
          });
        }
      }
      
      // Periodically generate advanced insights (every 5th receipt)
      if (previousReceipts.length % 5 === 0) {
        try {
          const advancedInsights = await generateAdvancedInsights(userId, previousReceipts);
          
          for (const insightData of advancedInsights) {
            await storage.createInsight(insightData);
          }
        } catch (insightError) {
          console.error("Error generating advanced insights:", insightError);
        }
      }
      
      // Generate budget warnings if nearing limits
      const budgetStatuses = await storage.getBudgetStatuses(userId);
      
      for (const status of budgetStatuses) {
        if (status.status === 'warning') {
          await storage.createInsight({
            userId,
            type: "budget-warning",
            content: `You've used ${status.percentage}% of your ${status.category} budget (₹${status.spent.toFixed(2)}/₹${status.limit.toFixed(2)}). Consider limiting your spending in this category.`,
            read: false,
            date: new Date(),
            relatedItemId: status.category
          });
        } else if (status.status === 'exceeded') {
          await storage.createInsight({
            userId,
            type: "budget-alert",
            content: `You've exceeded your ${status.category} budget by ₹${(status.spent - status.limit).toFixed(2)}. It's recommended to adjust your budget or reduce spending in this category.`,
            read: false,
            date: new Date(),
            relatedItemId: status.category
          });
        }
      }
    } catch (error) {
      console.error("Failed to process receipt items:", error);
    }
  }

  return httpServer;
}
