import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Gmail provider adapter
 * Handles authentication and interaction with Gmail API
 */
export class GmailProvider {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    // Initialize OAuth client with credentials from environment variables
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  
  /**
   * Generate authorization URL for Gmail OAuth
   */
  getAuthUrl(userId: number): string {
    // Define scopes required for email reading
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    // Generate state parameter with userId to verify on callback
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    // Generate authorization URL
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state
    });
  }
  
  /**
   * Handle OAuth callback and retrieve tokens
   */
  async handleCallback(code: string): Promise<{
    tokens: any;
    email: string;
  }> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Get user email
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return {
        tokens,
        email: profile.data.emailAddress || ''
      };
    } catch (error) {
      console.error('Error getting Gmail tokens:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get Gmail tokens');
    }
  }
  
  /**
   * Search for receipt emails
   */
  async searchEmails(tokens: any, query: string = '', maxResults: number = 10): Promise<any[]> {
    try {
      // Set up authentication with stored tokens
      this.oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // If no specific query, use a default query for receipts
      if (!query) {
        // Search for common receipt/order keywords in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const formattedDate = thirtyDaysAgo.toISOString().slice(0, 10);
        
        query = `after:${formattedDate} (subject:("receipt" OR "order" OR "purchase" OR "invoice" OR "confirmation") OR from:(amazon OR walmart OR target OR ereceipt OR donotreply OR noreply))`;
      }
      
      // Search for emails matching query
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });
      
      const messages = response.data.messages || [];
      
      // Fetch full message details for each result
      const emailDetails = await Promise.all(
        messages.map(async ({ id }) => {
          if (!id) return null;
          
          const message = await gmail.users.messages.get({
            userId: 'me',
            id,
            format: 'full'
          });
          
          return message.data;
        })
      );
      
      return emailDetails.filter(Boolean) as any[];
    } catch (error) {
      console.error('Error searching Gmail:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to search emails');
    }
  }
  
  /**
   * Get message content
   */
  async getMessage(tokens: any, messageId: string): Promise<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    content: string;
    attachments: Array<{
      id: string;
      filename: string;
      mimeType: string;
    }>;
  }> {
    try {
      // Set up authentication with stored tokens
      this.oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Get full message details
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      // Parse headers for subject, from, and date
      const headers = message.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      // Extract content and process attachments
      let content = '';
      const attachments: Array<{ id: string; filename: string; mimeType: string }> = [];
      
      // Helper function to process parts recursively
      const processParts = (parts: any[] = []) => {
        for (const part of parts) {
          // Text parts
          if (part.mimeType === 'text/plain' && part.body?.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            content += decoded;
          }
          
          // HTML parts (if no text available)
          if (part.mimeType === 'text/html' && part.body?.data && !content) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            // Strip HTML tags for simple text extraction
            content += decoded.replace(/<[^>]*>/g, ' ');
          }
          
          // Attachments
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType
            });
          }
          
          // Process nested parts
          if (part.parts) {
            processParts(part.parts);
          }
        }
      };
      
      // Start processing parts
      if (message.data.payload?.parts) {
        processParts(message.data.payload.parts);
      } else if (message.data.payload?.body?.data) {
        // For simple messages without multipart structure
        const decoded = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
        content = decoded;
      }
      
      return {
        id: messageId,
        subject,
        from,
        date,
        snippet: message.data.snippet || '',
        content,
        attachments
      };
    } catch (error) {
      console.error('Error getting Gmail message:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get message content');
    }
  }
  
  /**
   * Get attachment content
   */
  async getAttachment(tokens: any, messageId: string, attachmentId: string): Promise<{
    data: string;
    mimeType: string;
    filename: string;
  }> {
    try {
      // Set up authentication with stored tokens
      this.oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Get message to retrieve attachment info
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      // Find attachment details
      let mimeType = '';
      let filename = '';
      
      const findAttachmentInfo = (parts: any[] = []) => {
        for (const part of parts) {
          if (part.body?.attachmentId === attachmentId) {
            mimeType = part.mimeType;
            filename = part.filename;
            return true;
          }
          
          if (part.parts && findAttachmentInfo(part.parts)) {
            return true;
          }
        }
        return false;
      };
      
      if (message.data.payload?.parts) {
        findAttachmentInfo(message.data.payload.parts);
      }
      
      // Get attachment data
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      });
      
      return {
        data: attachment.data.data || '',
        mimeType,
        filename
      };
    } catch (error) {
      console.error('Error getting Gmail attachment:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get attachment');
    }
  }
  
  /**
   * Verify and refresh tokens if needed
   */
  async verifyTokens(tokens: any): Promise<any> {
    try {
      // Check if access token is expired and we have a refresh token
      if (tokens.refresh_token && (!tokens.expiry_date || tokens.expiry_date < Date.now())) {
        this.oauth2Client.setCredentials({
          refresh_token: tokens.refresh_token
        });
        
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        return credentials;
      }
      
      return tokens;
    } catch (error) {
      console.error('Error refreshing Gmail tokens:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to refresh tokens');
    }
  }
}