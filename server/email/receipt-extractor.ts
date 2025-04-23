import { EmailProvider } from '@shared/schema';
import { EmailProviderFactory } from './provider-factory';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Email receipt extraction service
export class EmailReceiptExtractor {
  /**
   * Extract receipt data from an email
   */
  async extractReceiptData(provider: EmailProvider, messageId: string) {
    // Get adapter for email provider 
    const adapter = EmailProviderFactory.getAdapterForProvider(provider);
    
    // Get email content
    const email = await adapter.getEmailContent(provider, messageId);
    
    // First, determine if this is likely a receipt
    const isReceipt = await this.isReceiptEmail(email);
    if (!isReceipt.isReceipt) {
      return {
        isReceipt: false,
        confidence: isReceipt.confidence,
        reason: isReceipt.reason
      };
    }
    
    // Use OpenAI to extract structured receipt data
    const extractedData = await this.extractStructuredData(email);
    
    return {
      isReceipt: true,
      confidence: isReceipt.confidence,
      receiptData: extractedData,
      messageId,
      emailData: {
        subject: email.subject,
        from: email.from,
        date: email.date,
        snippet: email.snippet
      }
    };
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
      
      Subject: ${email.subject}
      From: ${email.from}
      Snippet: ${email.snippet}
      
      First 300 characters of content:
      ${email.content.substring(0, 300)}...
      
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
      const result = JSON.parse(response.choices[0].message.content);
      return {
        isReceipt: result.isReceipt,
        confidence: result.confidence,
        reason: result.reason
      };
    } catch (error) {
      console.error('Error classifying email:', error);
      // Default to false with explanation
      return {
        isReceipt: false,
        confidence: 0,
        reason: `Error during classification: ${error.message}`
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
      
      Email Subject: ${email.subject}
      From: ${email.from}
      Date: ${email.date}
      
      Email Content:
      ${email.content.substring(0, 3000)} ${email.content.length > 3000 ? '...(content truncated)' : ''}
      
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
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      return {
        error: `Failed to extract receipt data: ${error.message}`,
        merchantName: null,
        date: null,
        total: null,
        items: [],
        confidence: 0
      };
    }
  }
}