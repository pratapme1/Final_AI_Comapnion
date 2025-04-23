import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const OAuthCallbackPage = () => {
  const [, setLocation] = useLocation();
  const { provider } = useParams<{ provider: string }>();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Get query parameters from URL
  const queryParams = new URLSearchParams(window.location.search);
  const code = queryParams.get("code");
  const errorParam = queryParams.get("error");
  
  useEffect(() => {
    // If error parameter is present, show error
    if (errorParam) {
      setStatus("error");
      setError(errorParam === "access_denied" ? 
        "You denied access to your email account" : 
        `Authentication error: ${errorParam}`);
      return;
    }
    
    // If no code parameter, show error
    if (!code) {
      setStatus("error");
      setError("No authorization code received. Please try again.");
      return;
    }
    
    // Handle the auth code exchange
    const exchangeCode = async () => {
      try {
        // Start progress animation
        setProgress(25);
        
        // Exchange the authorization code for tokens
        const response = await fetch(`/api/email/callback/${provider}?code=${code}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        setProgress(75);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to connect email account");
        }
        
        // Success!
        setProgress(100);
        setStatus("success");
        
        // Show success toast
        toast({
          title: "Email connected successfully",
          description: `Your ${provider} account has been connected successfully. You can now sync your receipts.`,
        });
        
        // Redirect back to receipts page after a short delay
        setTimeout(() => {
          setLocation("/receipts/upload");
        }, 2500);
      } catch (err) {
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
  }, [code, errorParam, provider, setLocation, toast]);
  
  // Handle manual redirect
  const handleRedirect = () => {
    setLocation("/receipts/upload");
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
              </div>
              <Button 
                onClick={handleRedirect}
                className="mt-4"
              >
                Return to Receipts
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
              <Button 
                onClick={handleRedirect}
                className="mt-4"
              >
                Return to Receipts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallbackPage;