import { Router, Request, Response } from 'express';
import { EmailService } from './email-service';
import { EmailProviderType } from './provider-factory';
import { z } from 'zod';

const router = Router();
const emailService = new EmailService();

// Helper function to ensure user is authenticated
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Zod schema for email provider type validation
const providerTypeSchema = z.enum(['gmail']);

/**
 * Get all email providers for authenticated user
 */
router.get('/providers', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const providers = await emailService.getUserEmailProviders(userId);
    
    res.json(providers);
  } catch (error) {
    console.error('Error fetching email providers:', error);
    res.status(500).json({ 
      message: 'Failed to fetch email providers',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get auth URL for connecting a new email provider
 */
router.get('/auth/:providerType', requireAuth, async (req: Request, res: Response) => {
  try {
    const { providerType } = req.params;
    
    // Validate provider type
    const result = providerTypeSchema.safeParse(providerType);
    if (!result.success) {
      return res.status(400).json({ message: `Unsupported email provider: ${providerType}` });
    }
    
    const userId = req.user!.id;
    const authUrl = emailService.getAuthUrl(userId, providerType as EmailProviderType);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      message: 'Failed to generate authentication URL',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * OAuth callback handler
 */
router.get('/callback/:providerType', async (req: Request, res: Response) => {
  try {
    const { providerType } = req.params;
    const { code, state } = req.query;
    
    // Validate provider type and required parameters
    const result = providerTypeSchema.safeParse(providerType);
    if (!result.success) {
      return res.status(400).json({ message: `Unsupported email provider: ${providerType}` });
    }
    
    if (!code || !state) {
      return res.status(400).json({ message: 'Missing required parameters: code and state' });
    }
    
    // Handle OAuth callback
    const provider = await emailService.handleCallback(
      code as string,
      state as string,
      providerType as EmailProviderType
    );
    
    // If user is already authenticated, redirect to email settings page
    if (req.isAuthenticated()) {
      return res.redirect('/settings/email');
    }
    
    // Otherwise, redirect to auth page with success message
    res.redirect('/auth?emailConnected=true');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ 
      message: 'Failed to complete authentication',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Delete an email provider
 */
router.delete('/providers/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = parseInt(id, 10);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }
    
    // Get provider to check ownership
    const provider = await emailService.getProviderById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Email provider not found' });
    }
    
    // Ensure user owns this provider
    if (provider.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Delete provider
    await emailService.deleteProvider(providerId);
    
    res.status(200).json({ message: 'Email provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting email provider:', error);
    res.status(500).json({ 
      message: 'Failed to delete email provider',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Start email sync
 */
router.post('/providers/:id/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = parseInt(id, 10);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }
    
    // Get provider to check ownership
    const provider = await emailService.getProviderById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Email provider not found' });
    }
    
    // Ensure user owns this provider
    if (provider.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Start sync job
    const syncJob = await emailService.startSync(providerId);
    
    res.status(200).json({ 
      message: 'Email sync started successfully',
      syncJob
    });
  } catch (error) {
    console.error('Error starting email sync:', error);
    res.status(500).json({ 
      message: 'Failed to start email sync',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get sync job status
 */
router.get('/sync/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const syncJobId = parseInt(id, 10);
    
    if (isNaN(syncJobId)) {
      return res.status(400).json({ message: 'Invalid sync job ID' });
    }
    
    const syncJob = await emailService.getSyncJob(syncJobId);
    
    if (!syncJob) {
      return res.status(404).json({ message: 'Sync job not found' });
    }
    
    // Get provider to check ownership
    const provider = await emailService.getProviderById(syncJob.providerId);
    
    if (!provider || provider.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.status(200).json(syncJob);
  } catch (error) {
    console.error('Error fetching sync job status:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sync job status',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get sync jobs for a provider
 */
router.get('/providers/:id/sync-jobs', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = parseInt(id, 10);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }
    
    // Get provider to check ownership
    const provider = await emailService.getProviderById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Email provider not found' });
    }
    
    // Ensure user owns this provider
    if (provider.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get sync jobs
    const syncJobs = await emailService.getProviderSyncJobs(providerId);
    
    res.status(200).json(syncJobs);
  } catch (error) {
    console.error('Error fetching sync jobs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sync jobs',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Process a single email for receipt extraction (for testing or manual processing)
 */
router.post('/process-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const { providerId, messageId } = req.body;
    
    if (!providerId || !messageId) {
      return res.status(400).json({ message: 'Missing required parameters: providerId and messageId' });
    }
    
    // Get provider to check ownership
    const provider = await emailService.getProviderById(providerId);
    
    if (!provider) {
      return res.status(404).json({ message: 'Email provider not found' });
    }
    
    // Ensure user owns this provider
    if (provider.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Process email
    const result = await emailService.processEmail(providerId, messageId);
    
    // Return extraction results
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing email:', error);
    res.status(500).json({ 
      message: 'Failed to process email',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;