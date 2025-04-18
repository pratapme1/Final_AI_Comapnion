import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import InsightCard from "@/components/insights/InsightCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { generateReceiptInsights, generateWeeklyDigest } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  BookOpen, 
  Receipt, 
  Loader2, 
  PiggyBank, 
  AlertTriangle, 
  RepeatIcon, 
  FileText, 
  LightbulbIcon,
  ArrowRightIcon
} from "lucide-react";

const Insights = () => {
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get receipts for the current user
  const { data: receipts } = useQuery({
    queryKey: ['/api/receipts'],
  });
  
  // Find the most recent receipt ID
  const latestReceiptId = receipts && receipts.length > 0 ? receipts[0].id : null;
  
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
    "receipt-analysis": 0,
  };

  insights?.forEach((insight: any) => {
    if (countByType[insight.type] !== undefined) {
      countByType[insight.type]++;
    }
  });

  // Get icon for each tab
  const getTabIcon = (type: string) => {
    switch (type) {
      case 'all': return <LightbulbIcon className="h-4 w-4 mr-2" />;
      case 'saving': return <PiggyBank className="h-4 w-4 mr-2" />;
      case 'budget-alert': return <AlertTriangle className="h-4 w-4 mr-2" />;
      case 'recurring': return <RepeatIcon className="h-4 w-4 mr-2" />;
      case 'digest': return <FileText className="h-4 w-4 mr-2" />;
      case 'receipt-analysis': return <Receipt className="h-4 w-4 mr-2" />;
      default: return <LightbulbIcon className="h-4 w-4 mr-2" />;
    }
  };

  // Get human-readable tab name
  const getTabName = (type: string) => {
    switch (type) {
      case 'all': return 'All Insights';
      case 'saving': return 'Savings';
      case 'budget-alert': return 'Budget Alerts';
      case 'recurring': return 'Recurring';
      case 'digest': return 'Weekly Digest';
      case 'receipt-analysis': return 'Receipt Analysis';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6 lg:mb-8 px-2 sm:px-0 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          AI Financial Insights
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-lg mx-auto">
          Smart Ledger's AI-powered analysis helps you optimize your finances with personalized recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 px-2 sm:px-0">
        {/* Left column: AI Action Cards */}
        <div className="space-y-4 lg:space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">Generate Insights</h2>
          
          {/* Generate Receipt Insights Card */}
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center font-medium">
                <Receipt className="h-5 w-5 mr-2 text-primary" />
                Receipt Analysis
              </CardTitle>
              <CardDescription>
                Analyze your existing receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Get AI-powered insights on your spending patterns, detect categories, and find savings opportunities.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => receiptInsightsMutation.mutate(1)} 
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
            </CardFooter>
          </Card>

          {/* Generate Weekly Digest Card */}
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center font-medium">
                <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                Weekly Digest
              </CardTitle>
              <CardDescription>
                Get a financial summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Receive a comprehensive weekly report with spending trends, budget status, and personalized recommendations.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-blue-200 hover:border-blue-500 hover:bg-blue-50"
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
                    Generate Digest
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Types of Insights Explanation */}
          <Card className="mt-6 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center font-medium">
                <LightbulbIcon className="h-5 w-5 mr-2 text-amber-500" />
                Types of Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start">
                  <PiggyBank className="h-4 w-4 mr-2 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Savings</h3>
                    <p className="text-xs text-gray-600">
                      Money-saving opportunities from your spending habits
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-700">Budget Alerts</h3>
                    <p className="text-xs text-gray-600">
                      Notifications when approaching or exceeding budgets
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <RepeatIcon className="h-4 w-4 mr-2 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-700">Recurring Expenses</h3>
                    <p className="text-xs text-gray-600">
                      Automatic detection of recurring payments
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <FileText className="h-4 w-4 mr-2 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Weekly Digest</h3>
                    <p className="text-xs text-gray-600">
                      Summary of your financial activity and personalized advice
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Insights List with Tabs */}
        <div className="lg:col-span-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">Your Insights</h2>
          
          <Tabs 
            defaultValue="all" 
            onValueChange={setActiveTab}
            className="mb-6"
          >
            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <TabsList className="flex min-w-max rounded-none bg-gray-50 p-0 border-b">
                  {Object.keys(countByType).map((tabKey) => (
                    <TabsTrigger 
                      key={tabKey}
                      value={tabKey} 
                      className="flex items-center data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none border-r last:border-r-0 py-2 px-3 whitespace-nowrap"
                    >
                      {getTabIcon(tabKey)}
                      <span className="hidden sm:inline">{getTabName(tabKey)}</span>
                      <span className="sm:hidden">{tabKey === 'budget-alert' ? 'Alert' : tabKey === 'receipt-analysis' ? 'Receipt' : getTabName(tabKey)}</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2 bg-gray-100 text-xs">
                        {countByType[tabKey]}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {Object.keys(countByType).map((tabKey) => (
                <TabsContent key={tabKey} value={tabKey} className="p-3 sm:p-4 bg-white">
                  {isLoading ? (
                    <div className="space-y-3 sm:space-y-4">
                      {[...Array(3)].map((_, index) => (
                        <Card key={index} className="bg-gray-50 border-gray-100">
                          <CardContent className="p-3 sm:p-6">
                            <div className="flex items-start">
                              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full mr-3 sm:mr-4" />
                              <div className="flex-1 space-y-1 sm:space-y-2">
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
                    <div className="space-y-3 sm:space-y-4">
                      {filteredInsights.map((insight: any) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-10">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 mb-3 sm:mb-4">
                        <LightbulbIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2">No insights yet</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto px-2 sm:px-0">
                        Generate your first insights by analyzing your receipts or creating a weekly digest.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mx-auto"
                        onClick={() => {
                          if (tabKey === 'digest') {
                            weeklyDigestMutation.mutate();
                          } else {
                            receiptInsightsMutation.mutate(1);
                          }
                        }}
                      >
                        <Sparkles className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Generate {tabKey === 'digest' ? 'Weekly Digest' : 'Insights'}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>

          {/* How It Works Section */}
          <div className="mt-6 lg:mt-8">
            <h3 className="text-base sm:text-lg font-medium mb-3 lg:mb-4 flex items-center">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-600" />
              How AI Financial Insights Works
            </h3>
            <div className="bg-gradient-to-r from-white to-gray-50 rounded-lg p-3 sm:p-5 border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4 shrink-0">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-0.5 sm:mb-1">1. Data Collection</h4>
                    <p className="text-xs text-gray-600">
                      Smart Ledger securely collects and processes your receipt data
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4 shrink-0">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-0.5 sm:mb-1">2. AI Analysis</h4>
                    <p className="text-xs text-gray-600">
                      Advanced AI algorithms detect patterns and analyze your transactions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4 shrink-0">
                    <LightbulbIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-0.5 sm:mb-1">3. Insights Generation</h4>
                    <p className="text-xs text-gray-600">
                      AI creates personalized insights based on your unique financial profile
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 sm:p-2 rounded-full mr-3 sm:mr-4 shrink-0">
                    <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-0.5 sm:mb-1">4. Actionable Recommendations</h4>
                    <p className="text-xs text-gray-600">
                      Turn insights into action with specific suggestions to improve your finances
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center sm:text-left">
                  All analysis happens securely on our servers. Your data is never shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
