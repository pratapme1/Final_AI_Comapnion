import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateReceiptInsights } from "@/lib/openai";
import { Sparkles, Loader2 } from "lucide-react";

interface ReceiptAIInsightsProps {
  receiptId: number;
}

const ReceiptAIInsights = ({ receiptId }: ReceiptAIInsightsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const insightsMutation = useMutation({
    mutationFn: () => generateReceiptInsights(receiptId),
    onSuccess: () => {
      toast({
        title: "AI insights generated",
        description: "New insights have been created based on this receipt.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate insights",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });
  
  const handleGenerateInsights = () => {
    insightsMutation.mutate();
  };
  
  return (
    <Card className="mt-4 border-dashed border-2 border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center font-medium text-primary">
          <Sparkles className="h-5 w-5 mr-2" />
          AI Financial Insights
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className={`space-y-3 ${isExpanded ? '' : 'max-h-24 overflow-hidden'}`}>
          <p className="text-sm text-gray-600">
            AI can analyze this receipt to provide you with:
          </p>
          
          <ul className="text-sm space-y-2 pl-5 list-disc text-gray-700">
            <li>Financial recommendations based on your spending patterns</li>
            <li>Potential savings opportunities on specific purchases</li>
            <li>Detection of recurring expenses and subscriptions</li>
            <li>Budget alerts and category insights</li>
          </ul>
          
          <p className="text-sm text-gray-600">
            This analysis is completely separate from the receipt upload and won't modify your existing data.
          </p>
        </div>
        
        {!isExpanded && (
          <Button 
            variant="link" 
            className="p-0 h-auto text-xs text-gray-500 mt-1"
            onClick={() => setIsExpanded(true)}
          >
            Read more
          </Button>
        )}
        
        <Separator className="my-4" />
        
        <div className="flex justify-end">
          <Button
            variant="default"
            size="sm"
            className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
            onClick={handleGenerateInsights}
            disabled={insightsMutation.isPending}
          >
            {insightsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating insights...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Insights
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptAIInsights;