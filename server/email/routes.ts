import { Router, Request, Response } from 'express';
import { EmailService } from './email-service';
import { EmailProviderType } from './provider-factory';
import { db } from '../db';
import { receipts } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Create router
const emailRouter = Router();
const emailService = new EmailService();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Route to initiate OAuth flow
emailRouter.get('/connect/:provider', ensureAuthenticated, (req: Request, res: Response) => {
  try {
    const providerType = req.params.provider as EmailProviderType;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }
    
    const authUrl = emailService.getAuthUrl(userId, providerType);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating email connection:', error);
    res.status(500).json({ 
      message: "Failed to initiate email connection", 
      error: error.message 
    });
  }
});

// OAuth callback handler
emailRouter.get('/callback/:provider', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const providerType = req.params.provider as EmailProviderType;
    
    if (!code || !state) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    
    const provider = await emailService.handleCallback(
      code as string, 
      state as string, 
      providerType
    );
    
    // Successful connection - redirect to the frontend email settings page
    res.redirect('/receipts?emailConnected=true');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ 
      message: "Failed to complete email connection", 
      error: error.message 
    });
  }
});

// Get all email providers for current user
emailRouter.get('/providers', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }
    
    const providers = await emailService.getUserEmailProviders(userId);
    res.json(providers);
  } catch (error) {
    console.error('Error fetching email providers:', error);
    res.status(500).json({ 
      message: "Failed to fetch email providers", 
      error: error.message 
    });
  }
});

// Delete an email provider
emailRouter.delete('/providers/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }
    
    // Verify the provider belongs to the user
    const providers = await emailService.getUserEmailProviders(userId);
    const providerExists = providers.some(p => p.id === providerId);
    
    if (!providerExists) {
      return res.status(403).json({ message: "You don't have access to this provider" });
    }
    
    await emailService.deleteProvider(providerId);
    res.status(200).json({ message: "Provider deleted successfully" });
  } catch (error) {
    console.error('Error deleting email provider:', error);
    res.status(500).json({ 
      message: "Failed to delete email provider", 
      error: error.message 
    });
  }
});

// Start email sync
emailRouter.post('/sync/:providerId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }
    
    // Verify the provider belongs to the user
    const providers = await emailService.getUserEmailProviders(userId);
    const providerExists = providers.some(p => p.id === providerId);
    
    if (!providerExists) {
      return res.status(403).json({ message: "You don't have access to this provider" });
    }
    
    const syncJob = await emailService.startSync(providerId);
    res.status(201).json(syncJob);
  } catch (error) {
    console.error('Error starting email sync:', error);
    res.status(500).json({ 
      message: "Failed to start email sync", 
      error: error.message 
    });
  }
});

// Get sync status
emailRouter.get('/sync/:jobId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const syncJob = await emailService.getSyncJob(jobId);
    
    if (!syncJob) {
      return res.status(404).json({ message: "Sync job not found" });
    }
    
    res.json(syncJob);
  } catch (error) {
    console.error('Error fetching sync job:', error);
    res.status(500).json({ 
      message: "Failed to get sync status", 
      error: error.message 
    });
  }
});

// Process a single email
emailRouter.post('/process-email', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { providerId, messageId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }
    
    if (!providerId || !messageId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    
    // Verify the provider belongs to the user
    const providers = await emailService.getUserEmailProviders(userId);
    const providerExists = providers.some(p => p.id === providerId);
    
    if (!providerExists) {
      return res.status(403).json({ message: "You don't have access to this provider" });
    }
    
    const result = await emailService.processEmail(providerId, messageId);
    res.json(result);
  } catch (error) {
    console.error('Error processing email:', error);
    res.status(500).json({ 
      message: "Failed to process email", 
      error: error.message 
    });
  }
});

// Save receipt from email
emailRouter.post('/save-receipt', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { providerId, messageId, receiptData } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }
    
    if (!providerId || !messageId || !receiptData) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    
    // Verify the provider belongs to the user
    const providers = await emailService.getUserEmailProviders(userId);
    const provider = providers.find(p => p.id === providerId);
    
    if (!provider) {
      return res.status(403).json({ message: "You don't have access to this provider" });
    }
    
    // Format receipt data
    const receiptItems = receiptData.items.map(item => ({
      name: item.name,
      price: parseFloat(item.price),
      category: item.category || 'Others'
    }));
    
    // Insert receipt into database
    const [receipt] = await db
      .insert(receipts)
      .values({
        userId,
        merchantName: receiptData.merchantName,
        date: new Date(receiptData.date),
        total: receiptData.total.toString(),
        items: receiptItems,
        category: receiptData.category || 'Others',
        source: 'email',
        sourceId: messageId,
        sourceProviderId: providerId,
        confidenceScore: receiptData.confidence || null
      })
      .returning();
    
    res.status(201).json(receipt);
  } catch (error) {
    console.error('Error saving receipt from email:', error);
    res.status(500).json({ 
      message: "Failed to save receipt", 
      error: error.message 
    });
  }
});

export default emailRouter;