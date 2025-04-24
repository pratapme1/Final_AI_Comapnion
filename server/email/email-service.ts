import { db } from '../db';
import { emailProviders, emailSyncJobs } from '@shared/schema';
import { EmailProvider, EmailProviderFactory, EmailProviderType, EmailSyncJob } from './provider-factory';
import { EmailReceiptExtractor } from './receipt-extractor';
import { eq, sql } from 'drizzle-orm';

/**
 * Service for managing email providers and receipt extraction
 */
export class EmailService {
  private extractor: EmailReceiptExtractor;
  
  constructor() {
    this.extractor = new EmailReceiptExtractor();
  }
  
  /**
   * Get authentication URL for a provider
   */
  getAuthUrl(userId: number, providerType: EmailProviderType): string {
    try {
      const provider = EmailProviderFactory.getProvider(providerType);
      return provider.getAuthUrl(userId);
    } catch (error) {
      console.error('Error generating auth URL:', error);
      throw new Error('Failed to generate authentication URL');
    }
  }
  
  /**
   * Handle OAuth callback from provider
   */
  async handleCallback(code: string, state: string, providerType: EmailProviderType): Promise<EmailProvider> {
    try {
      console.log('Starting handleCallback with:', { 
        hasCode: !!code, 
        codeLength: code ? code.length : 0,
        hasState: !!state, 
        stateLength: state ? state.length : 0,
        providerType
      });
      
      // Decode state parameter to get userId
      let userId;
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        userId = stateData.userId;
        console.log('Decoded state data:', { userId });
        
        if (!userId) {
          throw new Error('No userId found in state data');
        }
      } catch (error) {
        console.error('Error decoding state:', error);
        
        // Handle the error based on its type
        if (error instanceof Error) {
          throw new Error(`Invalid state parameter: ${error.message}`);
        } else {
          throw new Error('Invalid state parameter: Unknown error');
        }
      }
      
      // Get provider adapter
      console.log('Getting provider adapter for type:', providerType);
      const provider = EmailProviderFactory.getProvider(providerType);
      
      // Exchange code for tokens
      console.log('Exchanging auth code for tokens...');
      const { tokens, email } = await provider.handleCallback(code);
      console.log('Got tokens and email:', { hasTokens: !!tokens, email });
      
      if (!tokens) {
        throw new Error('No tokens received from provider');
      }
      
      if (!email) {
        throw new Error('No email address received from provider');
      }
      
      // Prepare tokens for storage (could be string or object)
      const tokensForStorage = typeof tokens === 'string' ? tokens : JSON.stringify(tokens);
      console.log('Prepared tokens for storage');
      
      // Check if this provider already exists for the user
      console.log('Checking for existing provider for:', { userId, email, providerType });
      
      const existingProviders = await db
        .select()
        .from(emailProviders)
        .where(
          sql`${emailProviders.userId} = ${userId} AND 
              ${emailProviders.email} = ${email} AND 
              ${emailProviders.providerType} = ${providerType}`
        );
      
      console.log('Found existing providers:', existingProviders.length);
      
      let savedProvider;
      const now = new Date();
      
      if (existingProviders.length > 0) {
        // Update existing provider
        console.log('Updating existing provider ID:', existingProviders[0].id);
        const [updated] = await db
          .update(emailProviders)
          .set({ 
            tokens: tokensForStorage,
            updatedAt: now
          })
          .where(eq(emailProviders.id, existingProviders[0].id))
          .returning();
        
        savedProvider = updated;
        console.log('Updated provider successfully');
      } else {
        // Create new provider
        console.log('Creating new provider');
        const [newProvider] = await db
          .insert(emailProviders)
          .values({
            userId,
            providerType,
            email,
            tokens: tokensForStorage,
            createdAt: now,
            updatedAt: now
          })
          .returning();
        
        savedProvider = newProvider;
        console.log('Created new provider ID:', newProvider.id);
      }
      
      console.log('Completed OAuth successfully for provider ID:', savedProvider.id);
      return savedProvider as EmailProvider;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      // Add more context to the error for easier debugging
      if (error instanceof Error) {
        throw new Error(`Authentication failed: ${error.message}`);
      } else {
        throw new Error('Failed to complete authentication: Unknown error');
      }
    }
  }
  
  /**
   * Get all email providers for a user
   */
  async getUserEmailProviders(userId: number): Promise<EmailProvider[]> {
    try {
      // Get all providers for the user
      const providers = await db
        .select()
        .from(emailProviders)
        .where(eq(emailProviders.userId, userId));
      
      // Add connected status to each provider
      return providers.map(provider => {
        // Do not expose actual tokens in the response
        return {
          ...provider,
          tokens: { connected: !!provider.tokens }
        };
      }) as EmailProvider[];
    } catch (error) {
      console.error('Error fetching email providers:', error);
      throw new Error('Failed to fetch email providers');
    }
  }
  
  /**
   * Get a specific provider by ID
   */
  async getProviderById(id: number): Promise<EmailProvider | null> {
    try {
      const [provider] = await db
        .select()
        .from(emailProviders)
        .where(eq(emailProviders.id, id));
      
      return provider as EmailProvider;
    } catch (error) {
      console.error('Error fetching email provider:', error);
      throw new Error('Failed to fetch email provider');
    }
  }
  
  /**
   * Delete a provider
   */
  async deleteProvider(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(emailProviders)
        .where(eq(emailProviders.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting email provider:', error);
      throw new Error('Failed to delete email provider');
    }
  }
  
  /**
   * Start syncing emails from a provider
   * @param providerId - The ID of the email provider
   * @param options - Optional parameters for the sync job
   * @returns The created sync job
   */
  async startSync(
    providerId: number, 
    options?: {
      dateRangeStart?: Date,
      dateRangeEnd?: Date,
      requestedLimit?: number
    }
  ): Promise<EmailSyncJob> {
    try {
      // Get provider
      const provider = await this.getProviderById(providerId);
      
      if (!provider) {
        throw new Error('Provider not found');
      }
      
      // Create sync job with optional parameters
      const [syncJob] = await db
        .insert(emailSyncJobs)
        .values({
          providerId,
          status: 'pending',
          startedAt: new Date(),
          dateRangeStart: options?.dateRangeStart,
          dateRangeEnd: options?.dateRangeEnd,
          requestedLimit: options?.requestedLimit,
          shouldCancel: false
        })
        .returning();
      
      // Start sync process in background
      this.runSyncProcess(provider, syncJob.id);
      
      return syncJob as EmailSyncJob;
    } catch (error) {
      console.error('Error starting email sync:', error);
      throw new Error('Failed to start email sync');
    }
  }
  
  /**
   * Cancel a running sync job
   * @param syncJobId - The ID of the sync job to cancel
   * @returns The updated sync job
   */
  async cancelSyncJob(syncJobId: number): Promise<EmailSyncJob> {
    try {
      // Mark the job for cancellation
      const [updatedJob] = await db
        .update(emailSyncJobs)
        .set({
          shouldCancel: true
        })
        .where(eq(emailSyncJobs.id, syncJobId))
        .returning();
      
      console.log(`Marked job ${syncJobId} for cancellation`);
      
      return updatedJob as EmailSyncJob;
    } catch (error) {
      console.error('Error cancelling sync job:', error);
      throw new Error('Failed to cancel sync job');
    }
  }
  
  /**
   * Get sync job by ID
   */
  async getSyncJob(id: number): Promise<EmailSyncJob | null> {
    try {
      const [syncJob] = await db
        .select()
        .from(emailSyncJobs)
        .where(eq(emailSyncJobs.id, id));
      
      return syncJob as EmailSyncJob;
    } catch (error) {
      console.error('Error fetching sync job:', error);
      throw new Error('Failed to fetch sync job');
    }
  }
  
  /**
   * Get all sync jobs for a provider
   */
  async getProviderSyncJobs(providerId: number): Promise<EmailSyncJob[]> {
    try {
      const syncJobs = await db
        .select()
        .from(emailSyncJobs)
        .where(eq(emailSyncJobs.providerId, providerId))
        .orderBy(sql`${emailSyncJobs.startedAt} DESC`)
        .limit(10);
      
      return syncJobs as EmailSyncJob[];
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
      throw new Error('Failed to fetch sync jobs');
    }
  }
  
  /**
   * Process a single email to extract receipt data
   */
  async processEmail(providerId: number, messageId: string): Promise<any> {
    try {
      const provider = await this.getProviderById(providerId);
      
      if (!provider) {
        throw new Error('Provider not found');
      }
      
      // Verify and refresh tokens if needed
      const adapter = EmailProviderFactory.getAdapterForProvider(provider);
      provider.tokens = await adapter.verifyTokens(provider.tokens);
      
      // Process the email
      const result = await this.extractor.extractReceiptData(provider, messageId);
      
      return result;
    } catch (error) {
      console.error('Error processing email:', error);
      throw new Error('Failed to process email');
    }
  }
  
  /**
   * Run sync process in background
   */
  private async runSyncProcess(provider: EmailProvider, syncJobId: number): Promise<void> {
    // Run async without awaiting
    (async () => {
      try {
        // Get the sync job to check for date ranges and limits
        const syncJob = await this.getSyncJob(syncJobId);
        if (!syncJob) {
          throw new Error('Sync job not found');
        }
        
        // Update job status to processing
        await db
          .update(emailSyncJobs)
          .set({ status: 'processing' })
          .where(eq(emailSyncJobs.id, syncJobId));
        
        // Get provider adapter
        const adapter = EmailProviderFactory.getAdapterForProvider(provider);
        
        // Verify and refresh tokens if needed
        provider.tokens = await adapter.verifyTokens(provider.tokens);
        
        // Search for potential receipt emails with date filter
        const searchOptions = {
          dateRangeStart: syncJob.dateRangeStart,
          dateRangeEnd: syncJob.dateRangeEnd
        };
        const emails = await adapter.searchEmails(provider.tokens, searchOptions);
        
        // Apply limit if specified
        let emailsToProcess = emails;
        if (syncJob.requestedLimit && syncJob.requestedLimit > 0 && syncJob.requestedLimit < emails.length) {
          emailsToProcess = emails.slice(0, syncJob.requestedLimit);
          console.log(`Limiting email processing to ${syncJob.requestedLimit} emails out of ${emails.length} found`);
        }
        
        // Update job with email count
        await db
          .update(emailSyncJobs)
          .set({ 
            emailsFound: emails.length 
          })
          .where(eq(emailSyncJobs.id, syncJobId));
        
        let processedCount = 0;
        let receiptsFound = 0;
        
        // Process each email
        for (const email of emailsToProcess) {
          // Check for cancellation request
          const currentJob = await this.getSyncJob(syncJobId);
          if (currentJob?.shouldCancel) {
            console.log(`Cancelling job ${syncJobId} as requested`);
            
            // Mark job as cancelled
            await db
              .update(emailSyncJobs)
              .set({ 
                status: 'cancelled',
                completedAt: new Date(),
                emailsProcessed: processedCount,
                receiptsFound,
                errorMessage: 'Job cancelled by user request'
              })
              .where(eq(emailSyncJobs.id, syncJobId));
            
            return; // Exit the function
          }
          
          try {
            // Add a small delay to prevent rate limiting (100ms)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Extract receipt data from email
            const result = await this.extractor.extractReceiptData(provider, email.id);
            
            processedCount++;
            
            if (result.isReceipt) {
              receiptsFound++;
            }
            
            // Update job progress
            await db
              .update(emailSyncJobs)
              .set({ 
                emailsProcessed: processedCount,
                receiptsFound 
              })
              .where(eq(emailSyncJobs.id, syncJobId));
          } catch (error) {
            console.error('Error processing email:', email.id, error);
            // Continue with next email
          }
        }
        
        // Update provider's last sync time
        await db
          .update(emailProviders)
          .set({ lastSyncAt: new Date() })
          .where(eq(emailProviders.id, provider.id));
        
        // Complete the job
        await db
          .update(emailSyncJobs)
          .set({ 
            status: 'completed',
            completedAt: new Date(),
            emailsProcessed: processedCount,
            receiptsFound 
          })
          .where(eq(emailSyncJobs.id, syncJobId));
      } catch (error) {
        console.error('Error in sync process:', error);
        
        // Mark job as failed
        await db
          .update(emailSyncJobs)
          .set({ 
            status: 'failed',
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          })
          .where(eq(emailSyncJobs.id, syncJobId));
      }
    })();
  }
}