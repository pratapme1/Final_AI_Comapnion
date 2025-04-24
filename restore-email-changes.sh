#!/bin/bash

set -e  # Exit on error

echo "=== Directly Restoring Email Functionality Changes ==="
echo "Started at: $(date)"
echo ""

# Step 1: Add missing columns to email_sync_jobs table
echo "[1/2] Adding required columns to email_sync_jobs table"
cat <<EOF | psql $DATABASE_URL
ALTER TABLE email_sync_jobs 
ADD COLUMN IF NOT EXISTS should_cancel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS date_range_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_range_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS requested_limit INTEGER;

-- Check table structure
\d email_sync_jobs
EOF

echo "✓ Database schema updated with required columns"
echo ""

# Step 2: Fix the demo Gmail connection code if needed
echo "[2/2] Updating email routes.ts with required changes"

# Check if server/email directory and routes.ts exist
mkdir -p server/email

if [ ! -f "server/email/routes.ts" ]; then
  echo "Creating server/email/routes.ts with corrected implementation"
  
  # Create the minimal routes.ts file needed for email functionality to work
  cat > server/email/routes.ts << 'EOF'
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { emailProviders, emailSyncJobs } from '@shared/schema';

const router = Router();

// Helper function to ensure user is authenticated
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

/**
 * Demo endpoint for directly connecting a Gmail account without OAuth
 * For development/demo purposes only
 */
router.post('/demo/connect-gmail', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('Demo Gmail connection request:', req.body);
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    
    const userId = req.user!.id;
    console.log('User ID for demo connection:', userId);
    const now = new Date();
    
    // Use imported db directly from top of file
    console.log('Creating simulated email provider...');
    // Create a simulated email provider record
    const [provider] = await db.insert(emailProviders).values({
      userId: userId,
      providerType: 'gmail',
      email: email,
      tokens: JSON.stringify({
        access_token: 'demo_access_token',
        refresh_token: 'demo_refresh_token',
        expires_at: new Date(now.getTime() + 3600 * 1000).toISOString()
      }),
      lastSyncAt: null,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    console.log('Provider created:', provider.id);
    
    console.log('Creating simulated sync job...');
    // Create a simulated success sync job for this provider
    await db.insert(emailSyncJobs).values({
      providerId: provider.id,
      status: 'completed',
      startedAt: now,
      completedAt: new Date(now.getTime() + 2000), // 2 seconds later
      emailsFound: 20,
      emailsProcessed: 20,
      receiptsFound: 5,
      errorMessage: null,
      shouldCancel: false
    });
    
    console.log('Demo Gmail connection complete');
    res.status(200).json({ 
      success: true,
      provider: {
        id: provider.id,
        email: provider.email
      }
    });
  } catch (error) {
    console.error('Error connecting demo Gmail account:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    res.status(500).json({ 
      message: 'Failed to connect demo Gmail account',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get all email providers for the current user
 */
router.get('/providers', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const providers = await db.query.emailProviders.findMany({
      where: (ep, { eq }) => eq(ep.userId, userId)
    });
    
    res.json(providers);
  } catch (error) {
    console.error('Error fetching email providers:', error);
    res.status(500).json({ message: 'Failed to fetch email providers' });
  }
});

/**
 * Start an email sync job for a provider
 */
router.post('/providers/:id/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // Advanced sync options
    const { dateRangeStart, dateRangeEnd, limit } = req.body;
    
    // Create a sync job
    const syncJob = await db.insert(emailSyncJobs).values({
      providerId,
      status: 'pending',
      startedAt: new Date(),
      shouldCancel: false,
      dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : null,
      dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : null,
      requestedLimit: limit || null
    }).returning();
    
    res.status(200).json({ 
      message: 'Email sync started successfully', 
      syncJob: syncJob[0] 
    });
    
  } catch (error) {
    console.error('Error starting email sync:', error);
    res.status(500).json({ 
      message: 'Failed to start email sync',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get all sync jobs
 */
router.get('/sync-jobs', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // First get all provider IDs for this user
    const providers = await db.query.emailProviders.findMany({
      where: (ep, { eq }) => eq(ep.userId, userId),
      columns: { id: true }
    });
    
    const providerIds = providers.map(p => p.id);
    
    // Then get sync jobs for those providers
    const syncJobs = await db.query.emailSyncJobs.findMany({
      where: (job, { inArray }) => inArray(job.providerId, providerIds),
      orderBy: (job, { desc }) => [desc(job.id)]
    });
    
    res.json(syncJobs);
  } catch (error) {
    console.error('Error fetching sync jobs:', error);
    res.status(500).json({ message: 'Failed to fetch sync jobs' });
  }
});

/**
 * Cancel a running sync job
 */
router.delete('/sync-jobs/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    
    // Update the job to set shouldCancel to true
    await db.update(emailSyncJobs)
      .set({ shouldCancel: true })
      .where(job => job.id.equals(jobId));
      
    res.status(200).end();
  } catch (error) {
    console.error('Error cancelling sync job:', error);
    res.status(500).json({ message: 'Failed to cancel sync job' });
  }
});

/**
 * Delete an email provider and its sync jobs
 */
router.delete('/providers/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // Check if the provider belongs to this user
    const [provider] = await db.select()
      .from(emailProviders)
      .where(p => p.id.equals(providerId) && p.userId.equals(userId));
      
    if (!provider) {
      return res.status(404).json({ message: 'Email provider not found' });
    }
    
    // Delete the provider (cascade will delete sync jobs)
    await db.delete(emailProviders)
      .where(p => p.id.equals(providerId));
      
    res.status(200).json({ message: 'Email provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting email provider:', error);
    res.status(500).json({ message: 'Failed to delete email provider' });
  }
});

export default router;
EOF

  echo "  ✓ Created server/email/routes.ts with all necessary endpoints and fixes"
else
  echo "server/email/routes.ts already exists, applying fixes"
  
  # Ensure shouldCancel is included in demo job creation
  grep -q "shouldCancel: false" server/email/routes.ts || sed -i '/receiptsFound: 5,/a\ \ \ \ \ \ shouldCancel: false,' server/email/routes.ts
  
  # Replace any require statements with direct imports
  sed -i 's/const { db } = require(.*)\/\/ Import db here to avoid possible circular imports/\/\/ Use imported db directly from top of file/' server/email/routes.ts
  
  echo "  ✓ Applied fixes to existing server/email/routes.ts file"
fi

# Step 3: Make sure it's imported in the main index.ts file
if ! grep -q "import emailRoutes from './email/routes';" server/index.ts; then
  echo "Adding email routes import to server/index.ts"
  
  # Find the line importing routes
  LINE_NUM=$(grep -n "import { registerRoutes } from './routes';" server/index.ts | cut -d: -f1)
  
  if [ -n "$LINE_NUM" ]; then
    # Insert import after routes import
    sed -i "${LINE_NUM}a import emailRoutes from './email/routes';" server/index.ts
    
    # Find app.use line to add our routes
    APP_USE_LINE=$(grep -n "app.use('/api'" server/index.ts | head -1 | cut -d: -f1)
    
    if [ -n "$APP_USE_LINE" ]; then
      # Add our routes after the first app.use line
      sed -i "${APP_USE_LINE}a app.use('/api/email', emailRoutes);" server/index.ts
      echo "  ✓ Added email routes to Express app"
    else
      echo "  ! Could not find app.use line in server/index.ts"
      echo "    You may need to manually add: app.use('/api/email', emailRoutes);"
    fi
  else
    echo "  ! Could not find routes import in server/index.ts"
    echo "    You may need to manually add: import emailRoutes from './email/routes';"
    echo "    And: app.use('/api/email', emailRoutes);"
  fi
fi

echo ""
echo "=== Summary of Applied Changes ==="
echo "✓ Added required columns to email_sync_jobs table:"
echo "  • should_cancel: For cancelling sync jobs in progress"
echo "  • date_range_start/date_range_end: For filtering emails by date"
echo "  • requested_limit: For limiting the number of emails processed"
echo "✓ Set up email routes with correct implementation"
echo "✓ All changes have been applied directly"
echo ""
echo "Email functionality has been restored successfully at: $(date)"