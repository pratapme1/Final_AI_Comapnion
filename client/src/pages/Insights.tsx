import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import InsightCard from "@/components/insights/InsightCard";
import SpendingPatterns from "@/components/insights/SpendingPatterns";
import RecurringExpenses from "@/components/insights/RecurringExpenses";
import GenerateInsights from "@/components/insights/GenerateInsights";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Insight {
  id: number;
  userId: number;
  content: string;
  type: string;
  date: string;
  read: boolean;
  relatedItemId: string | null;
}

const Insights = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useAuth();

  const { data: insights = [], isLoading } = useQuery<Insight[]>({
    queryKey: ['/api/insights'],
    enabled: !!user, // Only fetch if user is authenticated
  });

  // Filter insights based on active tab
  const filteredInsights = insights.filter((insight) => {
    if (activeTab === "all") return true;
    return insight.type === activeTab;
  });

  // Count insights by type
  const countByType: Record<string, number> = {
    all: insights.length || 0,
    saving: 0,
    "budget-alert": 0,
    recurring: 0,
    digest: 0,
    "pattern": 0, // New type for spending pattern insights
  };

  insights.forEach((insight) => {
    if (countByType[insight.type] !== undefined) {
      countByType[insight.type]++;
    }
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
          <Brain className="mr-2 h-6 w-6 text-indigo-600" />
          AI Financial Insights
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Smart suggestions and AI-powered analysis to optimize your finances
        </p>
      </div>

      {/* Advanced Insights Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">Enhanced AI Analysis</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* First column - Generate insights */}
          <div className="lg:col-span-1">
            <GenerateInsights />
          </div>
          
          {/* Second and third column - Spending patterns and recurring expenses */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <SpendingPatterns />
              <RecurringExpenses />
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="my-8" />

      {/* Individual Insights Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Financial Insights Feed</h2>
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
            <TabsTrigger value="pattern" className="relative">
              Patterns
              <Badge variant="secondary" className="ml-2 absolute -top-1 -right-1 text-xs">
                {countByType.pattern}
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
