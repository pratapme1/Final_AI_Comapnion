import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Mail, AlertCircle, RefreshCw, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EmailProvidersList from "./EmailProvidersList";
import SyncJobHistory from "./SyncJobHistory";

interface EmailProvider {
  id: number;
  userId: number;
  provider: string;
  email: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SyncJob {
  id: number;
  userId: number;
  providerId: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  resultsCount: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const EmailReceiptTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("providers");
  
  // Fetch connected email providers
  const providersQuery = useQuery({
    queryKey: ["/api/email/providers"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch sync jobs history
  const syncJobsQuery = useQuery({
    queryKey: ["/api/email/sync-jobs"],
    refetchInterval: 10000, // Refresh more frequently while syncing
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
  
  // Connect a new email provider (redirect to OAuth flow)
  const connectGmail = () => {
    window.location.href = "/api/email/auth/gmail";
  };

  // Get providers from query response safely
  const providers = providersQuery.data as EmailProvider[] || [];
  const hasProviders = Array.isArray(providers) && providers.length > 0;
  
  // Get sync jobs from query response safely
  const syncJobs = syncJobsQuery.data as SyncJob[] || [];
  const hasSyncJobs = Array.isArray(syncJobs) && syncJobs.length > 0;
  
  // Check if any sync job is in progress
  const isSyncing = syncJobs.some(job => job.status === "pending" || job.status === "in_progress");
  
  // Determine if we need to show the "No providers" message
  const showNoProviders = (!providersQuery.isLoading && !hasProviders);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Email Receipt Scanner
        </CardTitle>
        <CardDescription>
          Connect your email accounts to automatically find and import receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="providers">Connected Accounts</TabsTrigger>
            <TabsTrigger value="history">Sync History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="providers" className="space-y-4">
            {/* Connection management UI */}
            {showNoProviders ? (
              <div className="text-center py-8">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No email accounts connected</h3>
                <p className="mt-1 text-sm text-gray-500">Connect your email to find receipts</p>
                <div className="mt-6">
                  <Button onClick={connectGmail} className="inline-flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Gmail
                  </Button>
                </div>
              </div>
            ) : (
              <EmailProvidersList 
                providers={providers}
                isLoading={providersQuery.isLoading}
                onSync={(providerId) => startSyncMutation.mutate(providerId)}
                onDisconnect={(providerId) => disconnectMutation.mutate(providerId)}
                isSyncing={isSyncing}
              />
            )}
            
            {!showNoProviders && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={connectGmail}
                  className="inline-flex items-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Another Account
                </Button>
              </div>
            )}
            
            {/* Current Sync Status */}
            {isSyncing && (
              <Alert className="mt-6 bg-blue-50 border-blue-200">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertTitle className="text-blue-800">Email Sync in Progress</AlertTitle>
                <AlertDescription className="text-blue-700">
                  We're checking your emails for receipts. This may take a few minutes depending on how many emails need to be processed.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Tips */}
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-900">Tips</h4>
              <ul className="mt-2 text-sm text-gray-500 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>We'll only scan for emails containing receipts and order confirmations</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Emails are processed securely and we don't store your email content</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>For best results, sync your email periodically to capture new receipts</span>
                </li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <SyncJobHistory 
              syncJobs={syncJobs}
              isLoading={syncJobsQuery.isLoading}
              providers={providers}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailReceiptTab;