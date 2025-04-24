import { GmailProvider } from './providers/gmail';

// Define supported email provider types
export type EmailProviderType = string; // Currently supports 'gmail', but can be extended for other providers

// Email provider interface from database
export interface EmailProvider {
  id: number;
  userId: number;
  providerType: EmailProviderType;
  email: string;
  tokens: any; // OAuth tokens
  createdAt: Date;
  lastSyncAt?: Date | null;
}

// Email sync job interface
export interface EmailSyncJob {
  id: number;
  providerId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
  emailsProcessed?: number;
  emailsFound?: number;
  receiptsFound?: number;
  shouldCancel?: boolean;
  dateRangeStart?: Date | null;
  dateRangeEnd?: Date | null;
  requestedLimit?: number | null;
}

/**
 * Factory class to get appropriate email provider adapters
 */
export class EmailProviderFactory {
  // Map of provider types to provider classes
  private static providers: Record<string, any> = {
    gmail: GmailProvider
  };
  
  /**
   * Get provider adapter instance
   */
  static getProvider(providerType: EmailProviderType): any {
    const ProviderClass = this.providers[providerType];
    
    if (!ProviderClass) {
      throw new Error(`Unsupported email provider type: ${providerType}`);
    }
    
    return new ProviderClass();
  }
  
  /**
   * Get adapter for existing provider
   */
  static getAdapterForProvider(provider: EmailProvider): any {
    return this.getProvider(provider.providerType);
  }
  
  /**
   * Register new provider type
   */
  static registerProvider(type: string, providerClass: any): void {
    this.providers[type] = providerClass;
  }
}