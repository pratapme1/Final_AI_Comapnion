import { db } from '../db';
import { receipts, insights } from '@shared/schema';
import { EmailProvider, EmailProviderFactory } from './provider-factory';
import { enhancedCurrencyDetection } from '../currencyDetection';
import { processReceiptImage } from '../ai';

/**
 * Result of receipt extraction process
 */
interface ReceiptExtractionResult {
  isReceipt: boolean;
  confidence?: number;
  receipt?: {
    sourceType: string;
    sourceProvider: 'gmail';
    sourceId: string;
    sourceProviderId: number;
    merchantName: string;
    date: Date;
    total: string;
    items: any[];
    currency: string;
    evidence: string;
  };
  reason?: string;
  message?: string;
  error?: Error;
}

/**
 * Service for extracting receipt data from emails
 */
export class EmailReceiptExtractor {
  /**
   * Extract receipt data from an email
   */
  async extractReceiptData(provider: EmailProvider, messageId: string): Promise<ReceiptExtractionResult> {
    try {
      // Get provider adapter
      const adapter = EmailProviderFactory.getAdapterForProvider(provider);
      
      // Get email data
      const emailData = await adapter.getEmailData(provider.tokens, messageId);
      
      if (!emailData) {
        return {
          isReceipt: false,
          confidence: 0,
          reason: 'Email not found',
          message: 'Could not retrieve email data'
        };
      }
      
      // Check if this is likely a receipt email
      const { isReceipt, confidence, reason } = this.classifyReceiptEmail(emailData);
      
      if (!isReceipt) {
        return {
          isReceipt,
          confidence,
          reason,
          message: 'Email does not appear to be a receipt'
        };
      }
      
      // Extract attachment or content
      let receiptData;
      
      if (emailData.attachments?.length > 0) {
        // Process attachments that might contain receipts
        const attachmentData = await this.processAttachments(provider, emailData);
        if (attachmentData) {
          receiptData = attachmentData;
        }
      }
      
      // If no receipt found in attachments, try the email body
      if (!receiptData) {
        receiptData = await this.processEmailBody(emailData);
      }
      
      if (!receiptData) {
        return {
          isReceipt: false,
          confidence: 0.2,
          reason: 'No receipt data found',
          message: 'Could not extract receipt data from email'
        };
      }
      
      // Process and format the extracted data
      const formattedReceipt = this.formatReceiptData(receiptData, provider, messageId);
      
      // Determine currency for the receipt
      const currencyResult = enhancedCurrencyDetection({
        merchant: formattedReceipt.merchantName,
        items: formattedReceipt.items,
        totalAmount: parseFloat(formattedReceipt.total),
        currency: receiptData.currency || null,
        notes: receiptData.notes || null
      });
      
      // Save the receipt to database
      const [savedReceipt] = await db
        .insert(receipts)
        .values({
          userId: provider.userId,
          merchantName: formattedReceipt.merchantName,
          date: formattedReceipt.date,
          total: formattedReceipt.total,
          items: formattedReceipt.items,
          category: receiptData.category || 'Others',
          source: 'email',
          sourceId: messageId,
          sourceProviderId: provider.id,
          confidenceScore: confidence
        })
        .returning();
      
      // Generate insight for this receipt
      if (savedReceipt) {
        try {
          // Check for high-value purchase
          const totalAmount = parseFloat(formattedReceipt.total);
          if (totalAmount > 100) {
            const insight = {
              userId: provider.userId,
              content: `A high-value purchase of ${currencyResult.currency}${totalAmount.toFixed(2)} was detected at ${formattedReceipt.merchantName}.`,
              type: 'receipt-alert',
              date: new Date(),
              read: false,
              relatedItemId: savedReceipt.id.toString()
            };
            
            await db.insert(insights).values(insight);
          }
        } catch (err) {
          console.error('Error generating insight for receipt:', err);
        }
      }
      
      return {
        isReceipt: true,
        confidence,
        receipt: {
          ...formattedReceipt,
          currency: currencyResult.currency,
          evidence: currencyResult.evidence
        }
      };
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      return {
        isReceipt: false,
        confidence: 0,
        reason: 'Processing error',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
  
  /**
   * Classify if an email is likely a receipt
   */
  private classifyReceiptEmail(emailData: any): { isReceipt: boolean; confidence: number; reason: string } {
    // Check subject for receipt-related keywords
    const subjectKeywords = ['receipt', 'purchase', 'order', 'confirmation', 'invoice', 'payment', 'transaction'];
    const subject = emailData.subject?.toLowerCase() || '';
    
    const hasSubjectKeyword = subjectKeywords.some(keyword => subject.includes(keyword));
    
    if (hasSubjectKeyword) {
      return {
        isReceipt: true,
        confidence: 0.8,
        reason: 'Subject suggests receipt'
      };
    }
    
    // Check sender domain for common merchant domains
    const merchantDomains = [
      'amazon', 'walmart', 'target', 'bestbuy', 'ebay', 'doordash', 'uber', 'ubereats',
      'grubhub', 'postmates', 'instacart', 'shopping', 'store', 'shop', 'market', 'pay', 'invoice'
    ];
    
    const from = emailData.from?.toLowerCase() || '';
    const hasMerchantDomain = merchantDomains.some(domain => from.includes(domain));
    
    if (hasMerchantDomain) {
      return {
        isReceipt: true,
        confidence: 0.7,
        reason: 'Sender suggests merchant'
      };
    }
    
    // Check content for receipt-related content
    const body = emailData.body?.toLowerCase() || '';
    const contentKeywords = [
      'total', 'subtotal', 'tax', 'payment', 'purchase', 'order', 'item', 'quantity',
      'price', 'amount', 'paid', 'transaction', 'thank you for your purchase'
    ];
    
    const keywordMatches = contentKeywords.filter(keyword => body.includes(keyword));
    
    if (keywordMatches.length >= 3) {
      return {
        isReceipt: true,
        confidence: 0.6 + (keywordMatches.length * 0.05), // Higher confidence with more keyword matches
        reason: 'Content suggests receipt'
      };
    }
    
    // Default classification
    return {
      isReceipt: false,
      confidence: 0.2,
      reason: 'No indication that this is a receipt'
    };
  }
  
  /**
   * Process attachments for receipt data
   */
  private async processAttachments(provider: EmailProvider, emailData: any): Promise<any> {
    if (!emailData.attachments || emailData.attachments.length === 0) {
      return null;
    }
    
    const adapter = EmailProviderFactory.getAdapterForProvider(provider);
    
    // Look for PDF or image attachments
    const receiptAttachments = emailData.attachments.filter((attachment: any) => {
      const mimeType = attachment.mimeType?.toLowerCase() || '';
      return mimeType.includes('pdf') || 
             mimeType.includes('image') ||
             mimeType.includes('jpeg') ||
             mimeType.includes('png');
    });
    
    if (receiptAttachments.length === 0) {
      return null;
    }
    
    // Process the first potential receipt attachment
    try {
      const attachment = receiptAttachments[0];
      const attachmentData = await adapter.getAttachment(provider.tokens, emailData.id, attachment.id);
      
      if (!attachmentData || !attachmentData.data) {
        return null;
      }
      
      // Convert attachment data to base64
      const base64Data = attachmentData.data.toString('base64');
      
      // Process the attachment using OCR and AI
      const extractedData = await processReceiptImage(base64Data);
      
      return extractedData;
    } catch (error) {
      console.error('Error processing attachment:', error);
      return null;
    }
  }
  
  /**
   * Process email body for receipt data
   */
  private async processEmailBody(emailData: any): Promise<any> {
    // Extract receipt data from email body
    // This is a simplistic implementation and might need enhancements
    
    const body = emailData.body || '';
    
    // Check if the email body is HTML
    const isHtml = /<html|<body|<div|<table/.test(body);
    
    // Basic extraction of potential receipt data
    // In a real implementation, this would use more sophisticated parsing
    const extractedData: any = {
      merchantName: this.extractMerchantName(emailData),
      date: this.extractDate(emailData),
      total: this.extractTotal(body),
      items: this.extractItems(body, isHtml)
    };
    
    // If we couldn't extract essential data, return null
    if (!extractedData.merchantName || !extractedData.total) {
      return null;
    }
    
    return extractedData;
  }
  
  /**
   * Extract merchant name from email data
   */
  private extractMerchantName(emailData: any): string {
    // Try to get merchant name from From field
    if (emailData.from) {
      const fromMatch = emailData.from.match(/^"?([^"<@]+)"?\s*<.*>$/);
      if (fromMatch) {
        return fromMatch[1].trim();
      }
      
      // Try to extract domain name
      const domainMatch = emailData.from.match(/@([^.]+)/);
      if (domainMatch) {
        // Capitalize first letter
        return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
      }
    }
    
    // Try to get from subject
    if (emailData.subject) {
      const subjectParts = emailData.subject.split(/[:-]/);
      if (subjectParts.length > 1) {
        return subjectParts[0].trim();
      }
    }
    
    return 'Unknown Merchant';
  }
  
  /**
   * Extract date from email data
   */
  private extractDate(emailData: any): Date {
    // Try to get from email date
    if (emailData.date) {
      return new Date(emailData.date);
    }
    
    // Default to current date
    return new Date();
  }
  
  /**
   * Extract total amount from email body
   */
  private extractTotal(body: string): string {
    // Look for common total patterns
    const totalRegexes = [
      /total\D+\$?(\d+\.\d{2})/i,
      /total\s*:?\s*\$?(\d+\.\d{2})/i,
      /amount\D+\$?(\d+\.\d{2})/i,
      /payment\D+\$?(\d+\.\d{2})/i,
      /\$\s*(\d+\.\d{2})/
    ];
    
    for (const regex of totalRegexes) {
      const match = body.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '0.00';
  }
  
  /**
   * Extract items from email body
   */
  private extractItems(body: string, isHtml: boolean): any[] {
    // This is a very basic implementation
    // A real implementation would use more sophisticated parsing techniques
    
    const items: any[] = [];
    
    // If HTML, try to look for tables that might contain items
    if (isHtml) {
      const tableRows = body.match(/<tr[^>]*>(.*?)<\/tr>/gs);
      
      if (tableRows) {
        for (const row of tableRows) {
          const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs);
          
          if (cells && cells.length >= 2) {
            // Try to extract item name and price from cells
            const nameCell = cells[0].replace(/<[^>]+>/g, '').trim();
            const priceMatch = cells[cells.length - 1].match(/\$?(\d+\.\d{2})/);
            
            if (nameCell && priceMatch) {
              items.push({
                name: nameCell,
                price: parseFloat(priceMatch[1])
              });
            }
          }
        }
      }
    } else {
      // For plain text, try to find patterns like "Item name $XX.XX"
      const itemRegex = /([^\n\r$.]+)\s+\$?(\d+\.\d{2})/g;
      let match;
      
      while ((match = itemRegex.exec(body)) !== null) {
        items.push({
          name: match[1].trim(),
          price: parseFloat(match[2])
        });
      }
    }
    
    return items;
  }
  
  /**
   * Format receipt data into a consistent structure
   */
  private formatReceiptData(extractedData: any, provider: EmailProvider, messageId: string) {
    return {
      sourceType: 'email',
      sourceProvider: provider.providerType as 'gmail',
      sourceId: messageId,
      sourceProviderId: provider.id,
      merchantName: extractedData.merchantName || 'Unknown Merchant',
      date: extractedData.date || new Date(),
      total: extractedData.total?.toString() || '0.00',
      items: extractedData.items || []
    };
  }
}