import { EmailProviderFactory, EmailProviderType, EmailProvider, EmailSyncJob } from './provider-factory';
import { EmailReceiptExtractor } from './receipt-extractor';
import { db } from '../db';
import { emailProviders, emailSyncJobs } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Core service for email integration
 */
export class EmailService {
  private receiptExtractor: EmailReceiptExtractor;
  
  constructor() {
    this.receiptExtractor = new EmailReceiptExtractor();
  }
  
  /**
   * Get authentication URL for connecting email provider
   */
  getAuthUrl(userId: number, providerType: EmailProviderType): string {
    try {
      // Get provider adapter
      const provider = EmailProviderFactory.getProvider(providerType);
      
      // Generate authentication URL
      return provider.getAuthUrl(userId);
    } catch (error) {
      console.error('Error generating auth URL:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate authentication URL');
    }
  }
  
  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string, providerType: EmailProviderType): Promise<EmailProvider> {
    try {
      // Parse state parameter to get userId
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const userId = stateData.userId;
      
      if (!userId) {
        throw new Error('Invalid state parameter');
      }
      
      // Get provider adapter
      const provider = EmailProviderFactory.getProvider(providerType);
      
      // Exchange code for tokens and get user email
      const { tokens, email } = await provider.handleCallback(code);
      
      // Check if provider already exists for this user and email
      const existingProviders = await db
        .select()
        .from(emailProviders)
        .where(
          and(
            eq(emailProviders.userId, userId),
            eq(emailProviders.email, email),
            eq(emailProviders.providerType, providerType)
          )
        );
      
      let emailProvider;
      
      if (existingProviders.length > 0) {
        // Update existing provider
        const [updatedProvider] = await db
          .update(emailProviders)
          .set({
            tokens: tokens,
            lastSyncAt: null,
            updatedAt: new Date()
          })
          .where(eq(emailProviders.id, existingProviders[0].id))
          .returning();
        
        emailProvider = updatedProvider;
      } else {
        // Create new provider
        const [newProvider] = await db
          .insert(emailProviders)
          .values({
            userId,
            providerType,
            email,
            tokens,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        emailProvider = newProvider;
      }
      
      return emailProvider;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to complete authentication');
    }
  }
  
  /**
   * Get all email providers for a user
   */
  async getUserEmailProviders(userId: number): Promise<EmailProvider[]> {
    try {
      const providers = await db
        .select()
        .from(emailProviders)
        .where(eq(emailProviders.userId, userId))
        .orderBy(desc(emailProviders.createdAt));
      
      return providers.map(provider => ({
        ...provider,
        // Sensitive data should be redacted when sending to frontend
        tokens: { connected: true }
      }));
    } catch (error) {
      console.error('Error fetching user email providers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch email providers');
    }
  }
  
  /**
   * Get provider by ID
   */
  async getProviderById(id: number): Promise<EmailProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(emailProviders)
        .where(eq(emailProviders.id, id));
      
      return provider;
    } catch (error) {
      console.error('Error fetching email provider:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch email provider');
    }
  }
  
  /**
   * Delete email provider
   */
  async deleteProvider(id: number): Promise<void> {
    try {
      // First delete all sync jobs
      await db
        .delete(emailSyncJobs)
        .where(eq(emailSyncJobs.providerId, id));
      
      // Then delete the provider
      await db
        .delete(emailProviders)
        .where(eq(emailProviders.id, id));
    } catch (error) {
      console.error('Error deleting email provider:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete email provider');
    }
  }
  
  /**
   * Start an email sync job
   */
  async startSync(providerId: number): Promise<EmailSyncJob> {
    try {
      // Get the provider
      const provider = await this.getProviderById(providerId);
      
      if (!provider) {
        throw new Error('Email provider not found');
      }
      
      // Create a new sync job
      const [syncJob] = await db
        .insert(emailSyncJobs)
        .values({
          providerId,
          status: 'pending',
          startedAt: new Date()
        })
        .returning();
      
      // Start processing in the background
      this.processSync(syncJob.id, provider).catch(error => {
        console.error('Error processing sync job:', error);
        this.updateSyncStatus(syncJob.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      });
      
      return syncJob;
    } catch (error) {
      console.error('Error starting email sync:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to start email sync');
    }
  }
  
  /**
   * Get sync job by ID
   */
  async getSyncJob(id: number): Promise<EmailSyncJob | undefined> {
    try {
      const [job] = await db
        .select()
        .from(emailSyncJobs)
        .where(eq(emailSyncJobs.id, id));
      
      return job;
    } catch (error) {
      console.error('Error fetching sync job:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch sync job');
    }
  }
  
  /**
   * Get all sync jobs for a provider
   */
  async getProviderSyncJobs(providerId: number): Promise<EmailSyncJob[]> {
    try {
      const jobs = await db
        .select()
        .from(emailSyncJobs)
        .where(eq(emailSyncJobs.providerId, providerId))
        .orderBy(desc(emailSyncJobs.startedAt));
      
      return jobs;
    } catch (error) {
      console.error('Error fetching provider sync jobs:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch sync jobs');
    }
  }
  
  /**
   * Update sync job status
   */
  private async updateSyncStatus(
    jobId: number,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
    stats?: {
      emailsProcessed?: number;
      emailsFound?: number;
      receiptsFound?: number;
    }
  ): Promise<void> {
    try {
      const updates: any = { status };
      
      if (status === 'completed' || status === 'failed') {
        updates.completedAt = new Date();
      }
      
      if (errorMessage) {
        updates.errorMessage = errorMessage;
      }
      
      if (stats) {
        if (stats.emailsProcessed !== undefined) {
          updates.emailsProcessed = stats.emailsProcessed;
        }
        if (stats.emailsFound !== undefined) {
          updates.emailsFound = stats.emailsFound;
        }
        if (stats.receiptsFound !== undefined) {
          updates.receiptsFound = stats.receiptsFound;
        }
      }
      
      await db
        .update(emailSyncJobs)
        .set(updates)
        .where(eq(emailSyncJobs.id, jobId));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }
  
  /**
   * Process sync job
   */
  private async processSync(jobId: number, provider: EmailProvider): Promise<void> {
    try {
      // Update job status to processing
      await this.updateSyncStatus(jobId, 'processing');
      
      // Get provider adapter
      const adapter = EmailProviderFactory.getAdapterForProvider(provider);
      
      // Refresh tokens if needed
      const validTokens = await adapter.verifyTokens(provider.tokens);
      
      // Search for receipt emails
      const emails = await adapter.searchEmails(validTokens);
      
      // Stats tracking
      let emailsProcessed = 0;
      let receiptsFound = 0;
      
      // Process each email
      for (const email of emails) {
        try {
          emailsProcessed++;
          
          // Only process if message has an ID
          if (!email.id) continue;
          
          // Extract receipt data
          const result = await this.receiptExtractor.extractReceiptData(provider, email.id);
          
          // If it's a receipt, increment counter
          if (result.isReceipt && result.receipt) {
            receiptsFound++;
          }
          
          // Update progress every 5 emails
          if (emailsProcessed % 5 === 0) {
            await this.updateSyncStatus(jobId, 'processing', undefined, {
              emailsFound: emails.length,
              emailsProcessed,
              receiptsFound
            });
          }
        } catch (err) {
          // Log but continue processing other emails
          console.error(`Error processing email ${email.id}:`, err);
        }
      }
      
      // Update provider's last sync time
      await db
        .update(emailProviders)
        .set({
          lastSyncAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(emailProviders.id, provider.id));
      
      // Complete the job
      await this.updateSyncStatus(jobId, 'completed', undefined, {
        emailsFound: emails.length,
        emailsProcessed,
        receiptsFound
      });
    } catch (error) {
      console.error('Error processing sync job:', error);
      await this.updateSyncStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Process a single email
   */
  async processEmail(providerId: number, messageId: string) {
    try {
      // Get the provider
      const provider = await this.getProviderById(providerId);
      
      if (!provider) {
        throw new Error('Email provider not found');
      }
      
      // Extract receipt data
      return await this.receiptExtractor.extractReceiptData(provider, messageId);
    } catch (error) {
      console.error('Error processing email:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process email');
    }
  }
}