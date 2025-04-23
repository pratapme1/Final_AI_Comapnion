import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import EmailProvidersList from "@/components/receipts/EmailProvidersList";
import SyncJobHistory from "@/components/receipts/SyncJobHistory";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmailSettings() {
  const { toast } = useToast();
  
  // Check if email integration is available
  const statusQuery = useQuery({
    queryKey: ["/api/email/status"],
    // This is a simple ping to check if the email API is available
    retry: false,
  });
  
  // Fetch connected email providers
  const providersQuery = useQuery({
    queryKey: ["/api/email/providers"],
  });
  
  // Fetch sync jobs history
  const syncJobsQuery = useQuery({
    queryKey: ["/api/email/sync-jobs"],
  });
  
  // Start a new sync job for a provider
  const startSyncMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const response = await apiRequest("POST", `/api/email/providers/${providerId}/sync`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync started",
        description: "We'll check your emails for receipts. This may take a few minutes.",
      });
      
      // Refresh queries after starting a sync
      queryClient.invalidateQueries({ queryKey: ["/api/email/sync-jobs"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to start sync",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Disconnect an email provider
  const disconnectMutation = useMutation({
    mutationFn: async (providerId: number) => {
      await apiRequest("DELETE", `/api/email/providers/${providerId}`);
    },
    onSuccess: () => {
      toast({
        title: "Email provider disconnected",
        description: "Your email account has been disconnected successfully.",
      });
      
      // Refresh providers list
      queryClient.invalidateQueries({ queryKey: ["/api/email/providers"] });
    },
    onError: () => {
      toast({
        title: "Error disconnecting provider",
        description: "Failed to disconnect email provider. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Get providers from query response safely
  const providers = providersQuery.data || [];
  
  // Get sync jobs from query response safely
  const syncJobs = syncJobsQuery.data || [];
  
  // Check if any sync job is in progress
  const isSyncing = Array.isArray(syncJobs) && 
    syncJobs.some((job: any) => job.status === "pending" || job.status === "in_progress");

  if (statusQuery.isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (statusQuery.error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Email Integration Unavailable</AlertTitle>
        <AlertDescription>
          Could not connect to email service. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Receipt Integration</CardTitle>
          <CardDescription>
            Manage email accounts that Smart Ledger uses to automatically import receipts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accounts">
            <TabsList>
              <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
              <TabsTrigger value="history">Sync History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="accounts" className="pt-4">
              <EmailProvidersList />
            </TabsContent>
            
            <TabsContent value="history" className="pt-4">
              <SyncJobHistory />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
          <CardDescription>
            Information about how we handle your email data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">What data do we access?</h3>
              <p className="text-muted-foreground">
                We only scan emails for receipts and invoices. We don't read your personal emails or store
                your email password. We use OAuth to securely connect to your email account.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">How is your data secured?</h3>
              <p className="text-muted-foreground">
                Your connection tokens are encrypted and stored securely. You can revoke access
                anytime. We only extract receipt data and never store full email content.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">What happens during sync?</h3>
              <p className="text-muted-foreground">
                When you sync, we search your inbox for emails containing receipts or invoices.
                Our AI analyzes these to extract transaction details and automatically categorizes
                them for you. Only the relevant financial data is saved to your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}