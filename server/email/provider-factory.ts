import { GmailAdapter } from './providers/gmail';
import { EmailProvider } from '@shared/schema';

// Email provider types
export type EmailProviderType = 'gmail' | 'outlook'; // Extendable for other providers

// Email Provider Factory
export class EmailProviderFactory {
  private static providers: Record<string, any> = {
    gmail: GmailAdapter,
  };

  /**
   * Get provider adapter instance
   */
  static getProvider(providerType: EmailProviderType): any {
    const ProviderClass = EmailProviderFactory.providers[providerType];
    
    if (!ProviderClass) {
      throw new Error(`Unsupported email provider: ${providerType}`);
    }
    
    return new ProviderClass();
  }

  /**
   * Get adapter for existing provider
   */
  static getAdapterForProvider(provider: EmailProvider): any {
    return EmailProviderFactory.getProvider(provider.providerType as EmailProviderType);
  }

  /**
   * Register new provider type
   */
  static registerProvider(type: string, providerClass: any): void {
    EmailProviderFactory.providers[type] = providerClass;
  }
}