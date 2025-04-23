import { google } from 'googleapis';

// Define OAuth2 configuration
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly'
];

// Create OAuth2 client
const createOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Get the application URL from environment
  const appUrl = process.env.APP_URL;
  
  // Production environment should have APP_URL set
  // This should be the full domain of your deployed application, e.g. https://example.com
  const redirectUri = appUrl 
    ? `${appUrl}/api/email/callback/gmail` 
    : "http://localhost:5000/api/email/callback/gmail";
    
  console.log(`OAuth redirect URI: ${redirectUri}`);
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Gmail provider adapter
 */
export class GmailProvider {
  /**
   * Get authentication URL for connecting Gmail
   */
  getAuthUrl(userId: number): string {
    const oauth2Client = createOAuth2Client();
    
    // Create a state parameter to identify the user
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: OAUTH_SCOPES,
      state: state,
      prompt: 'consent' // Always show consent screen to ensure we get a refresh token
    });
    
    return authUrl;
  }
  
  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string): Promise<{ tokens: any; email: string }> {
    const oauth2Client = createOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set credentials to get user email
    oauth2Client.setCredentials(tokens);
    
    // Get user email
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    return {
      tokens,
      email: profile.data.emailAddress || ''
    };
  }
  
  /**
   * Verify and refresh tokens if needed
   */
  async verifyTokens(tokens: any): Promise<any> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    // Check if access token is expired and refresh if needed
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials;
      } catch (error) {
        console.error('Error refreshing access token:', error);
        throw new Error('Failed to refresh access token');
      }
    }
    
    return tokens;
  }
  
  /**
   * Search for receipt emails
   */
  async searchEmails(tokens: any, query: string = ''): Promise<any[]> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Default query to look for receipt-like emails if no specific query is provided
    const defaultQuery = 'subject:(receipt OR order OR purchase OR invoice OR confirmation) OR from:(amazon OR walmart OR target OR bestbuy OR ebay OR doordash OR uber)';
    const searchQuery = query || defaultQuery;
    
    try {
      // Search for emails
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 20 // Limit to 20 results for performance
      });
      
      const messageIds = response.data.messages || [];
      
      // Return list of message IDs
      return messageIds.map(message => ({
        id: message.id,
        threadId: message.threadId
      }));
    } catch (error) {
      console.error('Error searching Gmail messages:', error);
      throw new Error('Failed to search emails');
    }
  }
  
  /**
   * Get email data by ID
   */
  async getEmailData(tokens: any, messageId: string): Promise<any> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      // Get full message data
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      if (!message.data) {
        return null;
      }
      
      // Extract header data
      const headers = message.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      // Extract body content
      let body = '';
      
      if (message.data.payload?.body?.data) {
        // Direct body data
        body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf8');
      } else if (message.data.payload?.parts) {
        // Look for HTML or text parts
        const htmlPart = message.data.payload.parts.find(part => part.mimeType === 'text/html');
        const textPart = message.data.payload.parts.find(part => part.mimeType === 'text/plain');
        
        if (htmlPart?.body?.data) {
          body = Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
        } else if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
        }
      }
      
      // Extract attachments
      const attachments: any[] = [];
      
      const extractAttachments = (part: any) => {
        if (part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType
          });
        }
        
        if (part.parts) {
          part.parts.forEach(extractAttachments);
        }
      };
      
      if (message.data.payload?.parts) {
        message.data.payload.parts.forEach(extractAttachments);
      }
      
      return {
        id: messageId,
        threadId: message.data.threadId,
        subject,
        from,
        date,
        body,
        attachments
      };
    } catch (error) {
      console.error('Error getting Gmail message:', error);
      throw new Error('Failed to get email data');
    }
  }
  
  /**
   * Get attachment data
   */
  async getAttachment(tokens: any, messageId: string, attachmentId: string): Promise<any> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      });
      
      if (!attachment.data?.data) {
        return null;
      }
      
      // Decode attachment data
      const data = Buffer.from(attachment.data.data, 'base64');
      
      return {
        data,
        size: attachment.data.size
      };
    } catch (error) {
      console.error('Error getting Gmail attachment:', error);
      throw new Error('Failed to get attachment data');
    }
  }
}