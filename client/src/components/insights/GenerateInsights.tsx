import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const GenerateInsights = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Define mutation for generating insights
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/insights/generate");
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate insights query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      
      toast({
        title: "Success!",
        description: data.message || "Generated new insights for your finances",
        variant: "default",
      });
      
      setIsGenerating(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again later.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  const handleGenerateInsights = () => {
    setIsGenerating(true);
    generateInsightsMutation.mutate();
  };

  const isDisabled = isGenerating || generateInsightsMutation.isPending;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center text-indigo-800">
          <Lightbulb className="mr-2 h-5 w-5 text-amber-500" />
          <span>AI Financial Analysis</span>
        </CardTitle>
        <CardDescription className="text-indigo-600">Get personalized financial insights</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-indigo-700 mb-4">
          Our AI assistant can analyze your transaction history to generate personalized financial insights, identify spending patterns, and suggest opportunities to save.
        </p>
        
        <Button 
          onClick={handleGenerateInsights}
          disabled={isDisabled}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {isDisabled ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating insights...
            </>
          ) : (
            <>
              Generate New Insights
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        
        <p className="text-xs text-indigo-600 mt-3 text-center">
          This may take a few moments to analyze your financial data.
        </p>
      </CardContent>
    </Card>
  );
};

export default GenerateInsights;