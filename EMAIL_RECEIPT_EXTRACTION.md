# Email Receipt Extraction Implementation Guide

This document provides implementation details for the email receipt extraction functionality in Smart Ledger.

## Architecture Overview

The email receipt extraction system consists of several components:

1. **Gmail API Integration** - For accessing user emails
2. **Email Scanning Service** - For finding potential receipts
3. **Receipt Extraction Pipeline** - For extracting structured data
4. **OpenAI Integration** - For AI-powered data extraction
5. **Receipt Storage** - For saving to the database

## Implementation Steps

### 1. Email Provider Integration

The current implementation includes:

- **Gmail Provider**: Using Google's Gmail API to access emails
- Potential future providers: Outlook, Yahoo, etc.

Each email provider should implement a common interface:

```typescript
interface EmailProvider {
  authorize(code: string): Promise<TokenInfo>;
  refreshTokenIfNeeded(tokens: TokenInfo): Promise<TokenInfo>;
  searchEmails(query: string, tokens: TokenInfo): Promise<EmailSearchResult[]>;
  getEmail(emailId: string, tokens: TokenInfo): Promise<EmailContent>;
  getAttachment(emailId: string, attachmentId: string, tokens: TokenInfo): Promise<Buffer>;
}
```

### 2. Email Scanning

The scanning process identifies potential receipts with the following strategies:

1. **Subject-based matching**: Searching for terms like "receipt", "order", "purchase"
2. **Sender-based matching**: Common stores, e-commerce platforms, and services
3. **Content analysis**: Email body structure and keywords
4. **Attachment detection**: PDF and image analysis for receipt formats

Implementation in `EmailScanningService`:

```typescript
async function scanEmailsForReceipts(userId: number, providerId: number) {
  // Retrieve provider details
  const provider = await getEmailProvider(providerId);
  
  // Create search queries
  const queries = [
    'subject:(receipt OR order OR purchase OR invoice) newer_than:30d',
    'from:(amazon.com OR walmart.com OR ...) newer_than:30d'
    // Additional queries for better coverage
  ];
  
  // Execute search and process results
  for (const query of queries) {
    const emails = await provider.searchEmails(query);
    for (const email of emails) {
      await processEmailForReceipts(email);
    }
  }
}
```

### 3. Receipt Data Extraction

After identifying potential receipt emails, the system extracts structured data:

1. **Text extraction**: From email body and attachments
2. **OpenAI processing**: Using GPT-4 to identify receipt components
3. **Data validation**: Ensuring required fields are present
4. **Category inference**: Determining expense categories

Implementation in `ReceiptExtractor`:

```typescript
async function extractReceiptData(emailContent: EmailContent): Promise<ReceiptData | null> {
  // Extract text from email body
  const bodyText = extractTextFromHTML(emailContent.body);
  
  // Process attachments if present
  const attachmentText = await processAttachments(emailContent.attachments);
  
  // Combine all text
  const combinedText = [bodyText, attachmentText].filter(Boolean).join('\n\n');
  
  // Detect if this is actually a receipt
  const isReceipt = await detectIfReceipt(combinedText);
  if (!isReceipt) return null;
  
  // Use OpenAI to extract structured data
  const extractedData = await extractWithOpenAI(combinedText);
  
  // Validate and enhance the data
  return validateAndEnhanceReceiptData(extractedData);
}
```

### 4. OpenAI Integration

The system uses OpenAI's GPT-4 model to extract structured data from receipt text:

```typescript
async function extractWithOpenAI(text: string): Promise<ExtractedReceipt> {
  const prompt = `
    Extract the following information from this receipt:
    1. Merchant name
    2. Date of purchase
    3. Total amount
    4. Currency
    5. Individual items with:
       - Item name
       - Price
       - Quantity (if available)
    
    Format your response as a JSON object.
    
    Receipt text:
    ${text}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to parse OpenAI response");
  }
}
```

### 5. Data Categorization and Enhancement

After extraction, the system enhances the data:

1. **Item categorization**: Classifying items into budget categories
2. **Merchant recognition**: Identifying known merchants
3. **Currency detection**: Determining the currency used
4. **Recurring detection**: Identifying potential subscriptions

Implementation in `ReceiptEnhancer`:

```typescript
async function enhanceReceiptData(receipt: ReceiptData): Promise<EnhancedReceiptData> {
  // Categorize items
  const categorizedItems = await categorizeItems(receipt.items);
  
  // Detect the most frequent category for receipt-level categorization
  const primaryCategory = detectPrimaryCategory(categorizedItems);
  
  // Check for recurring indicators
  const recurringItems = await detectRecurringItems(categorizedItems);
  
  // Return enhanced data
  return {
    ...receipt,
    items: categorizedItems,
    category: primaryCategory,
    containsRecurring: recurringItems.length > 0
  };
}
```

## Database Schema Updates

The system requires specific database tables:

1. **email_providers** - Storing access to user email accounts
2. **email_sync_jobs** - Tracking synchronization status and results
3. **receipts** - Storing extracted receipt data
4. **receipt_items** - Storing individual line items

New types in `schema.ts`:

```typescript
export const emailProviders = pgTable('email_providers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  providerType: text('provider_type').notNull(), // 'gmail', 'outlook', etc.
  email: text('email').notNull(),
  tokens: text('tokens').notNull(), // JSON string with tokens
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const emailSyncJobs = pgTable('email_sync_jobs', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').notNull().references(() => emailProviders.id),
  status: text('status').notNull(), // 'queued', 'processing', 'completed', 'failed'
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  emailsFound: integer('emails_found'),
  emailsProcessed: integer('emails_processed'),
  receiptsFound: integer('receipts_found'),
  errorMessage: text('error_message')
});
```

## Sync Process Flow

The complete synchronization process:

1. **Initiate Sync**: User clicks "Sync" or automated scheduled sync
2. **Create Job**: Create a record in `email_sync_jobs` with status "queued"
3. **Authenticate**: Obtain valid access token using stored refresh token
4. **Search Emails**: Execute search queries for potential receipts
5. **Process Emails**: For each matching email, extract receipt data
6. **Store Receipts**: Save valid receipts to the database
7. **Update Status**: Mark job as "completed" with stats

Implementation in `EmailSyncService`:

```typescript
async function syncEmailProvider(providerId: number) {
  // Create sync job record
  const job = await createSyncJob(providerId);
  
  try {
    // Update status to processing
    await updateSyncJobStatus(job.id, 'processing');
    
    // Get provider and tokens
    const { provider, tokens } = await getProviderWithTokens(providerId);
    
    // Scan and process emails
    const result = await scanAndProcessEmails(provider, tokens);
    
    // Update job with results
    await completeSyncJob(job.id, {
      status: 'completed',
      emailsFound: result.emailsFound,
      emailsProcessed: result.emailsProcessed,
      receiptsFound: result.receiptsFound
    });
    
    return result;
  } catch (error) {
    // Handle errors
    await completeSyncJob(job.id, {
      status: 'failed',
      errorMessage: error.message
    });
    throw error;
  }
}
```

## Production Deployment Considerations

When deploying to production:

1. **Rate Limiting**: Implement retry logic and respect API rate limits
2. **Error Handling**: Comprehensive error handling for each step
3. **Logging**: Detailed logging for debugging
4. **Background Jobs**: Consider processing lengthy operations as background jobs
5. **Security**: Encrypt sensitive information like tokens

## Future Enhancements

Potential improvements to consider:

1. **Additional Email Providers**: Support for Outlook, Yahoo, etc.
2. **Advanced Filtering**: Allow users to specify search criteria
3. **Scheduled Syncs**: Automatic periodic checking for new receipts
4. **PDF Processing**: Advanced PDF parsing for better extraction
5. **Image Recognition**: OCR for attachments that are images
6. **Receipt Deduplication**: Preventing duplicate entries

## Testing Strategy

To properly test this functionality:

1. **Unit Tests**: Testing individual components with mocked dependencies
2. **Integration Tests**: Testing the complete flow with real API responses
3. **Manual Testing**: For verifying extraction quality
4. **Regression Testing**: Ensuring new receipt formats are handled correctly

## Performance Optimization

To optimize performance:

1. **Caching**: Cache processed emails to avoid repeat processing
2. **Parallel Processing**: Process multiple emails concurrently
3. **Rate Limiting**: Implement backoff strategies for API limits
4. **Selective Processing**: Focus on newer emails first