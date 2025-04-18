import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import InsightCard from "@/components/insights/InsightCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { generateReceiptInsights, generateWeeklyDigest } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, BookOpen, Receipt, Loader2 } from "lucide-react";

const Insights = () => {
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Mutation for generating insights from receipts
  const receiptInsightsMutation = useMutation({
    mutationFn: async (receiptId: number) => generateReceiptInsights(receiptId),
    onSuccess: () => {
      toast({
        title: "Receipt insights generated",
        description: "New insights have been created based on your receipts.",
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
  
  // Mutation for generating weekly digest
  const weeklyDigestMutation = useMutation({
    mutationFn: generateWeeklyDigest,
    onSuccess: () => {
      toast({
        title: "Weekly digest generated",
        description: "A new weekly financial digest has been created.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate weekly digest",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const { data: insights, isLoading } = useQuery({
    queryKey: ['/api/insights'],
  });

  // Filter insights based on active tab
  const filteredInsights = insights?.filter((insight: any) => {
    if (activeTab === "all") return true;
    return insight.type === activeTab;
  });

  // Count insights by type
  const countByType: Record<string, number> = {
    all: insights?.length || 0,
    saving: 0,
    "budget-alert": 0,
    recurring: 0,
    digest: 0,
  };

  insights?.forEach((insight: any) => {
    if (countByType[insight.type] !== undefined) {
      countByType[insight.type]++;
    }
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">AI Financial Insights</h1>
        <p className="text-sm text-gray-500 mt-1">
          Smart suggestions and alerts to optimize your finances
        </p>
      </div>

      {/* Tabs for filtering insights */}
      <Tabs 
        defaultValue="all" 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        {/* Responsive tabs - 2 rows on mobile, 1 row on larger screens */}
        <div className="overflow-x-auto pb-3 -mb-3">
          <TabsList className="inline-flex md:flex md:w-full min-w-max">
            <TabsTrigger value="all" className="relative">
              All Insights
              <Badge variant="secondary" className="ml-2 absolute -top-1 -right-1 text-xs">
                {countByType.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="saving" className="relative">
              Savings
              <Badge variant="secondary" className="ml-2 absolute -top-1 -right-1 text-xs">
                {countByType.saving}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="budget-alert" className="relative">
              Budget Alerts
              <Badge variant="secondary" className="ml-2 absolute -top-1 -right-1 text-xs">
                {countByType["budget-alert"]}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="relative">
              Recurring
              <Badge variant="secondary" className="ml-2 absolute -top-1 -right-1 text-xs">
                {countByType.recurring}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="digest" className="relative">
              Weekly Digest
              <Badge variant="secondary" className="ml-2 absolute -top-1 -right-1 text-xs">
                {countByType.digest}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>
        
        {Object.keys(countByType).map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey}>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start">
                        <Skeleton className="h-10 w-10 rounded-full mr-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredInsights?.length > 0 ? (
              <div className="space-y-4">
                {filteredInsights.map((insight: any) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No insights available in this category.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* AI Insights Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Generate Receipt Insights Card */}
        <Card className="border-2 border-dashed border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center font-medium text-primary">
              <Receipt className="h-5 w-5 mr-2" />
              Receipt Analysis
            </CardTitle>
            <CardDescription>
              Get AI insights from your existing receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Our AI will analyze your receipts to identify spending patterns, potential savings, and recurring expenses.
            </p>
            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
                onClick={() => receiptInsightsMutation.mutate(1)} // For simplicity, analyzing the first receipt
                disabled={receiptInsightsMutation.isPending}
              >
                {receiptInsightsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Receipts
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generate Weekly Digest Card */}
        <Card className="border-2 border-dashed border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center font-medium text-primary">
              <BookOpen className="h-5 w-5 mr-2" />
              Weekly Financial Digest
            </CardTitle>
            <CardDescription>
              Generate a comprehensive weekly summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Get a personalized summary of your financial activity, including spending trends, budget status, and recommendations.
            </p>
            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
                onClick={() => weeklyDigestMutation.mutate()}
                disabled={weeklyDigestMutation.isPending}
              >
                {weeklyDigestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Generate Weekly Digest
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Explanation Card */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-medium mb-4">About AI Financial Insights</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-2">How it Works</h3>
              <p className="text-sm text-gray-600">
                Smart Ledger analyzes your spending patterns and financial data to generate personalized insights. Our AI identifies optimization opportunities, detects recurring expenses, and provides actionable recommendations to improve your financial health.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="text-sm font-medium text-green-800 mb-2">Savings Suggestions</h3>
                <p className="text-sm text-green-700">
                  Identifies opportunities to save money through bulk purchases, cheaper alternatives, or subscription optimizations.
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Recurring Expense Detection</h3>
                <p className="text-sm text-yellow-700">
                  Automatically identifies recurring expenses and subscriptions to help you track and manage your regular payments.
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <h3 className="text-sm font-medium text-red-800 mb-2">Budget Alerts</h3>
                <p className="text-sm text-red-700">
                  Notifies you when you're approaching or exceeding your predefined category budgets to help you stay on track.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Weekly Smart Digest</h3>
                <p className="text-sm text-blue-700">
                  Provides a weekly summary of your spending, highlights budget concerns, and offers personalized financial tips.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Insights;
