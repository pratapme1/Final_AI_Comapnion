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
    console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.log('Auth status:', req.isAuthenticated() ? 'Authenticated' : 'Not authenticated');
    console.log('User ID:', req.user?.id || 'No user');
    
    // Validate provider type and required parameters
    const result = providerTypeSchema.safeParse(providerType);
    if (!result.success) {
      console.error(`Unsupported email provider: ${providerType}`);
      // Return HTML that will redirect via JavaScript
      return res.send(`
        <html>
          <head>
            <title>Redirecting...</title>
            <script>
              window.location.href = '/oauth-callback/${providerType}?error=unsupported_provider';
            </script>
          </head>
          <body>
            <p>Redirecting to app... If you are not redirected, <a href="/oauth-callback/${providerType}?error=unsupported_provider">click here</a>.</p>
          </body>
        </html>
      `);
    }
    
    if (!code || !state) {
      console.error('Missing required parameters: code and/or state');
      // Return HTML that will redirect via JavaScript
      return res.send(`
        <html>
          <head>
            <title>Redirecting...</title>
            <script>
              window.location.href = '/oauth-callback/${providerType}?error=missing_parameters';
            </script>
          </head>
          <body>
            <p>Redirecting to app... If you are not redirected, <a href="/oauth-callback/${providerType}?error=missing_parameters">click here</a>.</p>
          </body>
        </html>
      `);
    }
    
    try {
      // Extract the user ID from the state
      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const userId = decodedState.userId;
      console.log('Extracted user ID from state:', userId);
      
      // Handle OAuth callback
      const provider = await emailService.handleCallback(
        code as string,
        state as string,
        providerType as EmailProviderType
      );
      
      console.log('OAuth callback successful, provider data:', JSON.stringify({
        id: provider.id,
        email: provider.email,
        providerType: provider.providerType
      }));
      
      // Return HTML that will redirect via JavaScript with success
      return res.send(`
        <html>
          <head>
            <title>Redirecting...</title>
            <script>
              window.location.href = '/oauth-callback/${providerType}?success=true&providerId=${provider.id}';
            </script>
          </head>
          <body>
            <p>Redirecting to app... If you are not redirected, <a href="/oauth-callback/${providerType}?success=true&providerId=${provider.id}">click here</a>.</p>
          </body>
        </html>
      `);
    } catch (processingError) {
      console.error('Error processing OAuth callback:', processingError);
      
      // Return HTML that will redirect via JavaScript with error details
      const errorMessage = processingError instanceof Error ? processingError.message : 'unknown_error';
      return res.send(`
        <html>
          <head>
            <title>Redirecting...</title>
            <script>
              window.location.href = '/oauth-callback/${providerType}?error=${encodeURIComponent(errorMessage)}';
            </script>
          </head>
          <body>
            <p>Redirecting to app... If you are not redirected, <a href="/oauth-callback/${providerType}?error=${encodeURIComponent(errorMessage)}">click here</a>.</p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    
    // Return HTML that will redirect via JavaScript with general error
    return res.send(`
      <html>
        <head>
          <title>Redirecting...</title>
          <script>
            window.location.href = '/oauth-callback/${req.params.providerType || 'unknown'}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}';
          </script>
        </head>
        <body>
          <p>Redirecting to app... If you are not redirected, <a href="/oauth-callback/${req.params.providerType || 'unknown'}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}">click here</a>.</p>
        </body>
      </html>
    `);
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
    console.log('Sync endpoint called with params:', req.params, 'and body:', req.body);
    const { id } = req.params;
    const { startDate, endDate, limit } = req.body;
    const providerId = parseInt(id, 10);
    
    console.log('Parsed providerId:', providerId);
    
    if (isNaN(providerId)) {
      console.log('Invalid provider ID');
      return res.status(400).json({ message: 'Invalid provider ID' });
    }
    
    // Get provider to check ownership
    console.log('Fetching provider with ID:', providerId);
    const provider = await emailService.getProviderById(providerId);
    console.log('Provider found:', provider ? 'yes' : 'no');
    
    if (!provider) {
      console.log('Provider not found');
      return res.status(404).json({ message: 'Email provider not found' });
    }
    
    // Ensure user owns this provider
    console.log('Provider userId:', provider.userId, 'Request user ID:', req.user?.id);
    if (provider.userId !== req.user!.id) {
      console.log('Unauthorized - user does not own this provider');
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Parse date strings into Date objects
    const dateRangeStart = startDate ? new Date(startDate) : undefined;
    const dateRangeEnd = endDate ? new Date(endDate) : undefined;
    console.log('Date range:', dateRangeStart, 'to', dateRangeEnd);
    
    // Parse email limit (if provided)
    const requestedLimit = limit ? parseInt(limit, 10) : undefined;
    console.log('Requested limit:', requestedLimit);
    
    // Validation
    if (requestedLimit !== undefined && (isNaN(requestedLimit) || requestedLimit <= 0)) {
      console.log('Invalid limit value');
      return res.status(400).json({ message: 'Invalid limit value. Must be a positive number.' });
    }
    
    // Validate dates
    if (dateRangeStart && dateRangeEnd && dateRangeStart > dateRangeEnd) {
      console.log('Invalid date range');
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    
    // Start sync job with optional parameters
    console.log('Starting sync job with options:', { dateRangeStart, dateRangeEnd, requestedLimit });
    const syncJob = await emailService.startSync(providerId, {
      dateRangeStart,
      dateRangeEnd,
      requestedLimit
    });
    
    console.log('Sync job created:', syncJob?.id);
    res.status(200).json({ 
      message: 'Email sync started successfully',
      syncJob
    });
  } catch (error) {
    console.error('Error starting email sync:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    res.status(500).json({ 
      message: 'Failed to start email sync',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Cancel an in-progress sync job
 */
router.post('/sync/:id/cancel', requireAuth, async (req: Request, res: Response) => {
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
    
    // Only allow cancellation of running jobs
    if (syncJob.status !== 'processing' && syncJob.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel job with status: ${syncJob.status}. Only 'processing' or 'pending' jobs can be cancelled.` 
      });
    }
    
    // Mark the job for cancellation
    const updatedJob = await emailService.cancelSyncJob(syncJobId);
    
    res.status(200).json({
      message: 'Sync job cancellation requested',
      job: updatedJob
    });
  } catch (error) {
    console.error('Error cancelling sync job:', error);
    res.status(500).json({ 
      message: 'Failed to cancel sync job',
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
 * Get all sync jobs for the authenticated user
 */
router.get('/sync-jobs', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get all sync jobs for this user
    const syncJobs = await emailService.getUserSyncJobs(userId);
    
    res.status(200).json(syncJobs);
  } catch (error) {
    console.error('Error fetching all sync jobs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sync jobs',
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
    console.log('Demo Gmail connection request:', req.body);
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    
    const userId = req.user!.id;
    console.log('User ID for demo connection:', userId);
    const now = new Date();
    
    // Use imported db directly from top of file
    console.log('Creating simulated email provider...');
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
    
    console.log('Provider created:', provider.id);
    
    console.log('Creating simulated sync job...');
    // Create a simulated success sync job for this provider
    await db.insert(emailSyncJobs).values({
      providerId: provider.id,
      status: 'completed',
      startedAt: now,
      completedAt: new Date(now.getTime() + 2000), // 2 seconds later
      emailsFound: 20,
      emailsProcessed: 20,
      receiptsFound: 5,
      errorMessage: null,
      shouldCancel: false
    });
    
    console.log('Demo Gmail connection complete');
    res.status(200).json({ 
      success: true,
      provider: {
        id: provider.id,
        email: provider.email
      }
    });
  } catch (error) {
    console.error('Error connecting demo Gmail account:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    res.status(500).json({ 
      message: 'Failed to connect demo Gmail account',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;