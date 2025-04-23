import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../../db';
import { EmailProvider, emailProviders } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Gmail provider implementation
export class GmailAdapter {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate OAuth URL for user consent
   */
  getAuthUrl(userId: number): string {
    // Store state to verify callback 
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state
    });
  }

  /**
   * Handle OAuth callback and store credentials
   */
  async handleCallback(code: string, stateString: string): Promise<EmailProvider> {
    // Parse the state parameter
    const state = JSON.parse(Buffer.from(stateString, 'base64').toString());
    const userId = state.userId;

    // Exchange code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Get user's email
    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2'
    });
    
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      throw new Error('Unable to get user email from Google');
    }

    // Store provider in database
    const [emailProvider] = await db
      .insert(emailProviders)
      .values({
        userId,
        providerType: 'gmail',
        email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      })
      .returning();

    return emailProvider;
  }

  /**
   * Refresh access token if expired
   */
  async refreshToken(provider: EmailProvider): Promise<EmailProvider> {
    if (!provider.refreshToken) {
      throw new Error('No refresh token available for this provider');
    }

    this.oauth2Client.setCredentials({
      refresh_token: provider.refreshToken
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    // Update provider in database
    const [updatedProvider] = await db
      .update(emailProviders)
      .set({
        accessToken: credentials.access_token!,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        updatedAt: new Date()
      })
      .where(eq(emailProviders.id, provider.id))
      .returning();
    
    return updatedProvider;
  }

  /**
   * Get a Gmail client with proper authentication
   */
  private async getGmailClient(provider: EmailProvider) {
    // Check if token needs refresh
    const now = new Date();
    if (provider.tokenExpiry && provider.tokenExpiry < now && provider.refreshToken) {
      provider = await this.refreshToken(provider);
    }

    this.oauth2Client.setCredentials({
      access_token: provider.accessToken,
      refresh_token: provider.refreshToken
    });

    return google.gmail({
      version: 'v1',
      auth: this.oauth2Client
    });
  }

  /**
   * Search for receipt emails
   */
  async searchReceiptEmails(provider: EmailProvider, options: { 
    startDate?: Date, 
    endDate?: Date, 
    maxResults?: number 
  } = {}) {
    const gmail = await this.getGmailClient(provider);
    
    // Default to last 30 days if no date range specified
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Format dates for Gmail query
    const after = Math.floor(startDate.getTime() / 1000);
    const before = Math.floor(endDate.getTime() / 1000);

    // Build search query - look for common receipt keywords and date range
    const query = `after:${after} before:${before} (subject:(receipt OR order OR purchase OR invoice OR confirmation) OR from:(receipt OR order OR purchase OR invoice OR confirmation))`;
    
    // Search for messages matching query
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: options.maxResults || 50
    });

    const messages = response.data.messages || [];
    return messages;
  }

  /**
   * Get email content
   */
  async getEmailContent(provider: EmailProvider, messageId: string) {
    const gmail = await this.getGmailClient(provider);
    
    // Get full message details
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    // Extract header information
    const headers = message.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    // Extract message content based on MIME type
    let content = '';
    
    // Process parts recursively to find text content
    const extractTextFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          content += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data && !content) {
          // Only use HTML if no plain text is found
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Simple HTML-to-text conversion
          content += html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } else if (part.parts) {
          extractTextFromParts(part.parts);
        }
      }
    };

    if (message.data.payload?.parts) {
      extractTextFromParts(message.data.payload.parts);
    } else if (message.data.payload?.body?.data) {
      // For single-part messages
      content = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
    }

    return {
      id: messageId,
      threadId: message.data.threadId,
      subject,
      from,
      date,
      content,
      snippet: message.data.snippet,
      labelIds: message.data.labelIds,
      rawMessage: message.data
    };
  }
}