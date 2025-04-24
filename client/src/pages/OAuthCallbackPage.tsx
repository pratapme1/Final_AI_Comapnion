import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

const OAuthCallbackPage = () => {
  const [, setLocation] = useLocation();
  const { provider } = useParams<{ provider: string }>();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [providerId, setProviderId] = useState<string | null>(null);
  
  // Get query parameters from URL
  const queryParams = new URLSearchParams(window.location.search);
  const success = queryParams.get("success");
  const errorParam = queryParams.get("error");
  const providerIdParam = queryParams.get("providerId");
  const code = queryParams.get("code");
  const state = queryParams.get("state");
  
  useEffect(() => {
    console.log('OAuth callback received', { 
      provider, 
      success, 
      hasError: !!errorParam, 
      hasCode: !!code,
      hasState: !!state,
      hasProviderId: !!providerIdParam
    });

    // Start progress animation
    setProgress(25);
    
    // If we received a direct success signal from the server
    if (success === "true") {
      console.log('Success parameter received');
      setProgress(100);
      setStatus("success");
      
      if (providerIdParam) {
        setProviderId(providerIdParam);
      }
      
      // Show success toast
      toast({
        title: "Email connected successfully",
        description: `Your ${provider} account has been connected successfully. You can now sync your receipts.`,
      });
      
      // Refresh the providers list
      queryClient.invalidateQueries({ queryKey: ["/api/email/providers"] });
      
      // Redirect back to receipts page after a short delay
      setTimeout(() => {
        setLocation("/receipts/upload");
      }, 2500);
      
      return;
    }
    
    // If error parameter is present, show error
    if (errorParam) {
      console.log('Error parameter received:', errorParam);
      setStatus("error");
      setError(errorParam === "access_denied" ? 
        "You denied access to your email account" : 
        `Authentication error: ${decodeURIComponent(errorParam)}`);
      return;
    }
    
    // If we have both code and state, we need to process them
    if (code && state) {
      console.log('Code and state received, processing...');
      setProgress(50);
      
      // Handle the auth code exchange
      const exchangeCode = async () => {
        try {
          console.log('Exchanging code for tokens...');
          // Exchange the authorization code for tokens
          const response = await fetch(`/api/email/process-callback/${provider}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, state })
          });
          
          setProgress(75);
          
          if (!response.ok) {
            console.error('Process callback failed:', response.status, response.statusText);
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to connect email account");
          }
          
          const data = await response.json();
          
          // Success!
          console.log('Code exchange successful:', data);
          setProgress(100);
          setStatus("success");
          
          if (data.provider?.id) {
            setProviderId(data.provider.id.toString());
          }
          
          // Show success toast
          toast({
            title: "Email connected successfully",
            description: `Your ${provider} account has been connected successfully. You can now sync your receipts.`,
          });
          
          // Refresh the providers list
          queryClient.invalidateQueries({ queryKey: ["/api/email/providers"] });
          
          // Redirect back to receipts page after a short delay
          setTimeout(() => {
            setLocation("/receipts/upload");
          }, 2500);
        } catch (err) {
          console.error('Error processing callback:', err);
          setStatus("error");
          setError(err instanceof Error ? err.message : "Failed to connect email account");
          toast({
            title: "Connection failed",
            description: err instanceof Error ? err.message : "Failed to connect email account",
            variant: "destructive",
          });
        }
      };
      
      exchangeCode();
      return;
    }
    
    // If we don't have enough info, show error
    console.error('Insufficient parameters for OAuth callback');
    setStatus("error");
    setError("Missing required authentication parameters. Please try connecting again.");
    
  }, [code, state, success, errorParam, provider, providerIdParam, setLocation, toast]);
  
  // Handle manual redirect
  const handleRedirect = () => {
    setLocation("/receipts/upload");
  };
  
  // Retry connection
  const handleRetry = () => {
    setLocation("/receipts/upload?retry=true");
  };
  
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Connection
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Connecting your email account..."}
            {status === "success" && "Your email account has been connected successfully!"}
            {status === "error" && "There was a problem connecting your email account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-center">
                <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              </div>
              <p className="text-center text-sm text-gray-500">
                Please wait while we securely connect your {provider} account
              </p>
            </div>
          )}
          
          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-medium">Email Account Connected</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your {provider} account has been connected and is ready to sync receipts.
                </p>
                {providerId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Provider ID: {providerId}
                  </p>
                )}
              </div>
              <Button 
                onClick={handleRedirect}
                className="mt-4"
              >
                Continue to Receipts
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-medium">Connection Failed</h3>
                <p className="text-sm text-red-600 mt-1">
                  {error || "There was a problem connecting your email account"}
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                </Button>
                <Button 
                  onClick={handleRedirect}
                  className="mt-4"
                >
                  Return to Receipts
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallbackPage;