import { Router, Request, Response } from 'express';
import { EmailService } from './email-service';
import { EmailProviderType } from './provider-factory';
import { z } from 'zod';
import { db } from '../db';
import { emailProviders, emailSyncJobs } from '@shared/schema';

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
 * Check if email providers are configured
 */
router.get('/config-status', async (_req: Request, res: Response) => {
  try {
    // Check if needed environment variables are set
    const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    
    res.json({
      providers: {
        gmail: googleConfigured
      }
    });
  } catch (error) {
    console.error('Error checking provider configuration:', error);
    res.status(500).json({ 
      message: 'Failed to check provider configuration' 
    });
  }
});

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
    
    // Return the auth URL as JSON for client-side redirects
    // This allows us to handle CORS issues with different domains
    console.log(`Returning OAuth URL: ${authUrl}`);
    
    return res.json({ authUrl });
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
    
    // Log all information for debugging
    console.log('OAuth callback received:');
    console.log('Provider:', providerType);
    console.log('Code present:', !!code);
    console.log('State present:', !!state);
    
    // Validate provider type and required parameters
    const result = providerTypeSchema.safeParse(providerType);
    if (!result.success) {
      console.error(`Unsupported email provider: ${providerType}`);
      // Instead of returning an error, redirect to the frontend with an error param
      return res.redirect(`/oauth-callback/${providerType}?error=unsupported_provider`);
    }
    
    if (!code || !state) {
      console.error('Missing required parameters: code and/or state');
      // Instead of returning an error, redirect to the frontend with an error param
      return res.redirect(`/oauth-callback/${providerType}?error=missing_parameters`);
    }
    
    // Handle OAuth callback
    const provider = await emailService.handleCallback(
      code as string,
      state as string,
      providerType as EmailProviderType
    );
    
    // Redirect to the frontend callback handler with success
    console.log('OAuth callback successful, redirecting to frontend');
    return res.redirect(`/oauth-callback/${providerType}?success=true`);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    
    // Redirect to the frontend with error information
    return res.redirect(`/oauth-callback/${providerType}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`);
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
 * Process OAuth callback from front-end
 */
router.post('/process-callback/:providerType', requireAuth, async (req: Request, res: Response) => {
  try {
    const { providerType } = req.params;
    const { code, state } = req.body;
    
    // Log all information for debugging
    console.log('Processing OAuth callback:');
    console.log('Provider:', providerType);
    console.log('Code present:', !!code);
    console.log('State present:', !!state);
    
    // Validate provider type and required parameters
    const result = providerTypeSchema.safeParse(providerType);
    if (!result.success) {
      return res.status(400).json({ message: `Unsupported email provider: ${providerType}` });
    }
    
    if (!code || !state) {
      return res.status(400).json({ message: 'Missing required parameters: code and/or state' });
    }
    
    // Get the user ID from the authenticated user
    const userId = req.user!.id;
    // Recreate the state parameter with the user ID
    const newState = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    // Handle OAuth callback
    const provider = await emailService.handleCallback(
      code,
      newState,
      providerType as EmailProviderType
    );
    
    // Return success response
    res.status(200).json({ 
      success: true,
      provider: {
        id: provider.id,
        email: provider.email
      }
    });
  } catch (error) {
    console.error('Error processing OAuth callback:', error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    
    // Return error response
    res.status(500).json({ 
      message: 'Failed to complete authentication',
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

/**
 * Demo endpoint for directly connecting a Gmail account without OAuth
 * For development/demo purposes only
 */
router.post('/demo/connect-gmail', requireAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    
    const userId = req.user!.id;
    const now = new Date();
    
    // Create a simulated email provider record
    const [provider] = await db.insert(emailProviders).values({
      userId: userId,
      providerType: 'gmail',
      email: email,
      tokens: JSON.stringify({
        access_token: 'demo_access_token',
        refresh_token: 'demo_refresh_token',
        expires_at: new Date(now.getTime() + 3600 * 1000).toISOString()
      }),
      lastSyncAt: null,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    // Create a simulated success sync job for this provider
    await db.insert(emailSyncJobs).values({
      providerId: provider.id,
      status: 'completed',
      startedAt: now,
      completedAt: new Date(now.getTime() + 2000), // 2 seconds later
      emailsFound: 20,
      emailsProcessed: 20,
      receiptsFound: 5,
      errorMessage: null
    });
    
    res.status(200).json({ 
      success: true,
      provider: {
        id: provider.id,
        email: provider.email
      }
    });
  } catch (error) {
    console.error('Error connecting demo Gmail account:', error);
    res.status(500).json({ 
      message: 'Failed to connect demo Gmail account',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;