import { google } from 'googleapis';

// Define OAuth2 configuration
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly'
];

// Create OAuth2 client
const createOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET');
  }
  
  console.log('Creating OAuth2 client with credentials...');
  
  // For Replit environment, determine the domain in multiple ways
  let appUrl = '';
  
  // Priority 1: Explicitly configured APP_URL
  if (process.env.APP_URL) {
    console.log('Using configured APP_URL:', process.env.APP_URL);
    appUrl = process.env.APP_URL;
  }
  // Priority 2: Configured custom domain
  else if (process.env.CUSTOM_DOMAIN) {
    console.log('Using CUSTOM_DOMAIN:', process.env.CUSTOM_DOMAIN);
    appUrl = `https://${process.env.CUSTOM_DOMAIN}`;
  }
  // Priority 3: Replit domains from environment
  else if (process.env.REPLIT_DOMAINS) {
    // Use the first domain in the list (primary domain)
    const replitDomains = process.env.REPLIT_DOMAINS.split(',');
    const primaryDomain = replitDomains[0]?.trim();
    
    if (primaryDomain) {
      console.log('Using primary REPLIT_DOMAIN:', primaryDomain);
      appUrl = `https://${primaryDomain}`;
    }
  }
  
  // Priority 4: Hardcoded Replit domain as last resort
  if (!appUrl) {
    appUrl = 'https://ai-companion-vishnupratapkum.replit.app';
    console.log('Using hardcoded domain as last resort:', appUrl);
  }
  
  // Construct the redirect URI
  let redirectUri = `${appUrl}/api/email/callback/gmail`;
  
  // For local development outside Replit (rare case)
  if (process.env.NODE_ENV === 'development' && !appUrl.includes('replit.app') && !process.env.REPLIT_DOMAINS) {
    redirectUri = "http://localhost:5000/api/email/callback/gmail";
    console.log('Using localhost for development:', redirectUri);
  }
  
  // Ensure the URI uses the correct protocol
  if (redirectUri.includes('replit.app') || redirectUri.includes('repl.co')) {
    // Force HTTPS for any Replit domain
    if (redirectUri.startsWith('http:')) {
      redirectUri = redirectUri.replace('http:', 'https:');
      console.log('Fixed protocol in redirect URI to HTTPS');
    }
  }
  
  // Log final URI for debugging
  console.log(`OAuth redirect URI: ${redirectUri}`);
  
  // Create and return the OAuth2 client
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
   * @param tokens - OAuth tokens
   * @param options - Search options including date ranges
   * @returns List of email message IDs
   */
  async searchEmails(
    tokens: any, 
    options?: { 
      query?: string,
      dateRangeStart?: Date,
      dateRangeEnd?: Date 
    }
  ): Promise<any[]> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Default query to look for receipt-like emails if no specific query is provided
    let defaultQuery = 'subject:(receipt OR order OR purchase OR invoice OR confirmation) OR from:(amazon OR walmart OR target OR bestbuy OR ebay OR doordash OR uber)';
    
    // If date ranges are provided, add them to the query
    if (options?.dateRangeStart || options?.dateRangeEnd) {
      // Format dates for Gmail query syntax: YYYY/MM/DD
      let dateQuery = '';
      
      if (options.dateRangeStart) {
        const startDate = options.dateRangeStart;
        const formattedStartDate = `${startDate.getFullYear()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}`;
        dateQuery += ` after:${formattedStartDate}`;
      }
      
      if (options.dateRangeEnd) {
        const endDate = options.dateRangeEnd;
        const formattedEndDate = `${endDate.getFullYear()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;
        dateQuery += ` before:${formattedEndDate}`;
      }
      
      // Combine the date range with the default query
      defaultQuery = `(${defaultQuery})${dateQuery}`;
      console.log('Search query with date filters:', defaultQuery);
    }
    
    // Use provided query or the default one
    const searchQuery = options?.query || defaultQuery;
    
    try {
      // Search for emails
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 50 // Increase to 50 with ability to be limited by the sync job
      });
      
      const messageIds = response.data.messages || [];
      console.log(`Found ${messageIds.length} potential receipt emails`);
      
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