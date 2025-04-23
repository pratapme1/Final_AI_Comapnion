import { db } from '../db';
import { EmailProvider, EmailSyncJob, emailProviders, emailSyncJobs } from '@shared/schema';
import { EmailProviderFactory, EmailProviderType } from './provider-factory';
import { EmailReceiptExtractor } from './receipt-extractor';
import { eq, desc, and } from 'drizzle-orm';

// Main email service class that coordinates email operations
export class EmailService {
  private receiptExtractor: EmailReceiptExtractor;
  
  constructor() {
    this.receiptExtractor = new EmailReceiptExtractor();
  }

  /**
   * Get authentication URL for connecting email provider
   */
  getAuthUrl(userId: number, providerType: EmailProviderType): string {
    const provider = EmailProviderFactory.getProvider(providerType);
    return provider.getAuthUrl(userId);
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string, providerType: EmailProviderType): Promise<EmailProvider> {
    const provider = EmailProviderFactory.getProvider(providerType);
    return provider.handleCallback(code, state);
  }

  /**
   * Get all email providers for a user
   */
  async getUserEmailProviders(userId: number): Promise<EmailProvider[]> {
    return db
      .select()
      .from(emailProviders)
      .where(eq(emailProviders.userId, userId))
      .orderBy(desc(emailProviders.createdAt));
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id: number): Promise<EmailProvider | undefined> {
    const [provider] = await db
      .select()
      .from(emailProviders)
      .where(eq(emailProviders.id, id));
    
    return provider;
  }

  /**
   * Delete email provider
   */
  async deleteProvider(id: number): Promise<void> {
    await db
      .delete(emailProviders)
      .where(eq(emailProviders.id, id));
  }

  /**
   * Start an email sync job
   */
  async startSync(providerId: number): Promise<EmailSyncJob> {
    // Get provider
    const provider = await this.getProviderById(providerId);
    if (!provider) {
      throw new Error(`Email provider with ID ${providerId} not found`);
    }

    // Create sync job
    const [syncJob] = await db
      .insert(emailSyncJobs)
      .values({
        providerId,
        status: 'pending',
        startTime: new Date(),
      })
      .returning();

    // Process in background
    this.processSync(syncJob.id, provider).catch(error => {
      console.error(`Error processing sync job ${syncJob.id}:`, error);
      this.updateSyncStatus(syncJob.id, 'failed', { errorMessage: error.message });
    });

    return syncJob;
  }

  /**
   * Get sync job by ID
   */
  async getSyncJob(id: number): Promise<EmailSyncJob | undefined> {
    const [job] = await db
      .select()
      .from(emailSyncJobs)
      .where(eq(emailSyncJobs.id, id));
    
    return job;
  }

  /**
   * Get all sync jobs for a provider
   */
  async getProviderSyncJobs(providerId: number): Promise<EmailSyncJob[]> {
    return db
      .select()
      .from(emailSyncJobs)
      .where(eq(emailSyncJobs.providerId, providerId))
      .orderBy(desc(emailSyncJobs.createdAt));
  }

  /**
   * Update sync job status
   */
  private async updateSyncStatus(
    jobId: number, 
    status: string, 
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    await db
      .update(emailSyncJobs)
      .set({
        status,
        ...additionalData,
        updatedAt: new Date(),
        ...(status === 'completed' || status === 'failed' ? { endTime: new Date() } : {})
      })
      .where(eq(emailSyncJobs.id, jobId));
  }

  /**
   * Process sync job
   */
  private async processSync(jobId: number, provider: EmailProvider): Promise<void> {
    try {
      // Update job to processing
      await this.updateSyncStatus(jobId, 'processing');
      
      // Get adapter for provider
      const adapter = EmailProviderFactory.getAdapterForProvider(provider);
      
      // Search for receipt emails
      const messages = await adapter.searchReceiptEmails(provider);
      
      // Update total count
      await this.updateSyncStatus(jobId, 'processing', { 
        totalEmails: messages.length,
        processedEmails: 0
      });

      let receiptsFound = 0;
      
      // Process each message
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        // Extract receipt data
        const extractionResult = await this.receiptExtractor.extractReceiptData(provider, message.id);
        
        // If it's a receipt with good confidence, save it
        if (extractionResult.isReceipt && extractionResult.confidence > 0.7 && extractionResult.receiptData) {
          receiptsFound++;
          
          // Store the receipt for later processing
          // Note: We're not saving the receipts automatically here, just keeping track of them
          // Later, the user will be shown these receipts and decide which ones to save
        }
        
        // Update job progress
        await this.updateSyncStatus(jobId, 'processing', { 
          processedEmails: i + 1,
          receiptsFound
        });
      }
      
      // Update provider last sync time
      await db
        .update(emailProviders)
        .set({
          lastSync: new Date(),
          updatedAt: new Date()
        })
        .where(eq(emailProviders.id, provider.id));
      
      // Complete the job
      await this.updateSyncStatus(jobId, 'completed');
      
    } catch (error) {
      console.error(`Error processing sync job ${jobId}:`, error);
      await this.updateSyncStatus(jobId, 'failed', { errorMessage: error.message });
      throw error;
    }
  }

  /**
   * Process a single email
   */
  async processEmail(providerId: number, messageId: string) {
    const provider = await this.getProviderById(providerId);
    if (!provider) {
      throw new Error(`Email provider with ID ${providerId} not found`);
    }
    
    return this.receiptExtractor.extractReceiptData(provider, messageId);
  }
}