import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OAuthCallbackPage({ providerType }: { providerType: string }) {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code and state from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        
        if (!code) {
          setError("Authorization code missing from callback");
          setIsProcessing(false);
          return;
        }
        
        // Call API to complete OAuth flow
        const response = await fetch(`/api/email/callback/${providerType}?code=${code}&state=${state}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Authentication failed");
        }
        
        // Redirect to receipt upload page with email tab active
        navigate("/receipts?tab=email");
      } catch (error) {
        console.error("OAuth callback error:", error);
        setError(error instanceof Error ? error.message : "Failed to complete authentication");
        setIsProcessing(false);
      }
    };
    
    handleCallback();
  }, [navigate, providerType]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="p-6 bg-background rounded-lg shadow-md max-w-md w-full">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="text-center">
            <button
              onClick={() => navigate("/receipts")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Return to Receipts
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Completing Authentication</h1>
      <p className="text-muted-foreground">Please wait while we connect your email account...</p>
    </div>
  );
}