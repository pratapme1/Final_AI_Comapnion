import { EmailProvider, EmailProviderFactory } from './provider-factory';
import OpenAI from 'openai';
import { enhancedCurrencyDetection } from '../currencyDetection';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Service to extract receipt data from emails
 */
export class EmailReceiptExtractor {
  /**
   * Extract receipt data from an email
   */
  async extractReceiptData(provider: EmailProvider, messageId: string) {
    try {
      // Get adapter for provider
      const adapter = EmailProviderFactory.getAdapterForProvider(provider);
      
      // Refresh tokens if needed
      const validTokens = await adapter.verifyTokens(provider.tokens);
      
      // Get message content
      const email = await adapter.getMessage(validTokens, messageId);
      
      // Check if this is a receipt email
      const { isReceipt, confidence, reason } = await this.isReceiptEmail(email);
      
      if (!isReceipt || confidence < 0.6) {
        return {
          isReceipt: false,
          confidence,
          reason,
          message: 'Email does not appear to be a receipt'
        };
      }
      
      // Extract structured data
      const receiptData = await this.extractStructuredData(email);
      
      // Apply enhanced currency detection
      const enhancedData = enhancedCurrencyDetection(receiptData);
      
      return {
        isReceipt: true,
        confidence,
        receipt: {
          ...enhancedData,
          sourceType: 'email',
          sourceProvider: provider.providerType,
          sourceMessageId: messageId,
          emailFrom: email.from,
          emailSubject: email.subject
        }
      };
    } catch (error) {
      console.error('Error extracting receipt data from email:', error);
      return {
        isReceipt: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to extract receipt data'
      };
    }
  }
  
  /**
   * Determine if an email is a receipt
   */
  private async isReceiptEmail(email: any) {
    try {
      // Create prompt for classification
      const prompt = `
      I need to determine if this email contains a receipt or order confirmation. 
      Here are the details:
      
      Subject: ${email.subject || 'No subject'}
      From: ${email.from || 'Unknown sender'}
      Snippet: ${email.snippet || 'No snippet available'}
      
      First 300 characters of content:
      ${(email.content || '').substring(0, 300)}...
      
      Respond with JSON in this format:
      {
        "isReceipt": boolean, // true if this is a receipt/order confirmation
        "confidence": number, // confidence score between 0 and 1
        "reason": string // brief explanation of the decision
      }
      `;

      // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      // Parse the response
      const content = response.choices[0].message.content || '{}';
      const result = JSON.parse(content);
      return {
        isReceipt: result.isReceipt || false,
        confidence: result.confidence || 0,
        reason: result.reason || 'Unknown'
      };
    } catch (error) {
      console.error('Error classifying email:', error);
      // Default to false with explanation
      return {
        isReceipt: false,
        confidence: 0,
        reason: `Error during classification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract structured data from receipt email
   */
  private async extractStructuredData(email: any) {
    try {
      // Create prompt for extraction
      const prompt = `
      Extract receipt information from this email. I need the following details in a structured format:
      
      Email Subject: ${email.subject || 'No subject'}
      From: ${email.from || 'Unknown sender'}
      Date: ${email.date || 'Unknown date'}
      
      Email Content:
      ${(email.content || '').substring(0, 3000)} ${(email.content || '').length > 3000 ? '...(content truncated)' : ''}
      
      Extract and return the following information in JSON format:
      - merchantName: The store or company name
      - date: The purchase date (ISO format preferred)
      - total: The total amount (just the number)
      - currency: The currency used (USD, EUR, etc.)
      - items: Array of purchased items, each with:
        - name: Product/service name
        - price: Price as a number
        - quantity: Quantity if available
      - orderNumber: Order or transaction ID if available
      
      If any field cannot be determined with confidence, set it to null rather than guessing.
      Provide a confidence score between 0-1 for overall extraction quality.
      `;

      // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      // Parse the response
      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      return {
        error: `Failed to extract receipt data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        merchantName: null,
        date: null,
        total: null,
        items: [],
        confidence: 0
      };
    }
  }
}