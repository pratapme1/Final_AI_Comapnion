import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import EmailProvidersList from "@/components/receipts/EmailProvidersList";
import SyncJobHistory from "@/components/receipts/SyncJobHistory";

export default function EmailSettings() {
  // Check if email integration is available
  const { data: emailEnabled, isLoading, error } = useQuery({
    queryKey: ["/api/email/status"],
    // This is a simple ping to check if the email API is available
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
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