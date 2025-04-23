import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Mail, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmailProvidersList() {
  const { toast } = useToast();
  const [syncInProgress, setSyncInProgress] = useState<Record<number, boolean>>({});
  
  // Fetch connected email providers
  const { 
    data: providers = [], 
    isLoading, 
    error,
    isError
  } = useQuery({
    queryKey: ["/api/email/providers"],
    refetchInterval: (data) => {
      // Check if any sync is in progress
      const anySyncInProgress = Object.values(syncInProgress).some(Boolean);
      return anySyncInProgress ? 5000 : false;
    }
  });
  
  // Connect new provider
  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/email/auth/gmail");
      return await res.json();
    },
    onSuccess: (data) => {
      // Redirect to Google OAuth page
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Failed to connect Gmail",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete provider
  const deleteProviderMutation = useMutation({
    mutationFn: async (providerId: number) => {
      await apiRequest("DELETE", `/api/email/providers/${providerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/providers"] });
      toast({
        title: "Email provider removed",
        description: "Your email account has been disconnected successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove provider",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Start email sync
  const startSyncMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const res = await apiRequest("POST", `/api/email/providers/${providerId}/sync`);
      return await res.json();
    },
    onSuccess: (data, providerId) => {
      setSyncInProgress((prev) => ({ ...prev, [providerId]: true }));
      // Poll for sync job completion
      pollSyncStatus(data.syncJob.id, providerId);
      toast({
        title: "Email sync started",
        description: "We're scanning your emails for receipts. This may take a few minutes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start sync",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Poll sync status
  const pollSyncStatus = async (syncJobId: number, providerId: number) => {
    try {
      const res = await apiRequest("GET", `/api/email/sync/${syncJobId}`);
      const syncJob = await res.json();
      
      if (syncJob.status === 'completed' || syncJob.status === 'failed') {
        setSyncInProgress((prev) => ({ ...prev, [providerId]: false }));
        queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
        toast({
          title: syncJob.status === 'completed' ? "Email sync completed" : "Email sync failed",
          description: syncJob.status === 'completed' 
            ? `Found ${syncJob.receiptsFound || 0} receipts in your emails.`
            : syncJob.errorMessage || "An error occurred during sync.",
          variant: syncJob.status === 'completed' ? "default" : "destructive",
        });
      } else {
        // Continue polling
        setTimeout(() => pollSyncStatus(syncJobId, providerId), 5000);
      }
    } catch (error) {
      setSyncInProgress((prev) => ({ ...prev, [providerId]: false }));
      toast({
        title: "Failed to check sync status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading email providers</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Something went wrong. Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }

  // Type assertion for providers
  const providersList = Array.isArray(providers) ? providers : [];
  
  return (
    <div className="space-y-6">
      {/* Connected providers */}
      {providersList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {providersList.map((provider: any) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {provider.email}
                  </CardTitle>
                  <Badge>{provider.providerType}</Badge>
                </div>
                <CardDescription>
                  {provider.lastSyncAt 
                    ? `Last synced: ${new Date(provider.lastSyncAt).toLocaleString()}`
                    : 'Not synced yet'}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteProviderMutation.mutate(provider.id)}
                  disabled={syncInProgress[provider.id] || deleteProviderMutation.isPending}
                >
                  {deleteProviderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
                <Button
                  onClick={() => startSyncMutation.mutate(provider.id)}
                  disabled={syncInProgress[provider.id] || startSyncMutation.isPending}
                >
                  {syncInProgress[provider.id] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Receipts
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Email Accounts Connected</CardTitle>
            <CardDescription>
              Connect your email account to automatically import receipts from your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              When you connect an email account, Smart Ledger will scan your inbox for receipts
              and automatically import them. We only look for emails that contain receipts and
              never store your email password.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => connectGmailMutation.mutate()}
              disabled={connectGmailMutation.isPending}
            >
              {connectGmailMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Connect Gmail
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Add more providers button */}
      {providersList.length > 0 && (
        <Button
          variant="outline"
          onClick={() => connectGmailMutation.mutate()}
          disabled={connectGmailMutation.isPending}
          className="mt-4"
        >
          {connectGmailMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Connect Another Account
        </Button>
      )}
    </div>
  );
}