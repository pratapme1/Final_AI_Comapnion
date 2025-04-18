import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertOctagon, TrendingUp, TrendingDown, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SpendingPatterns = () => {
  const [expanded, setExpanded] = useState(false);

  interface MerchantData {
    name: string;
    frequency: number;
    totalSpent: string;
  }
  
  interface TrendData {
    direction: 'up' | 'down';
    description: string;
  }
  
  interface PatternData {
    patterns: string[];
    frequentMerchants: MerchantData[];
    categoryTrends: TrendData[];
    unusualSpending: string[];
  }
  
  interface SpendingPatternsResponse {
    patterns: PatternData;
  }
  
  const { data: patternsData, isLoading, error } = useQuery<SpendingPatternsResponse>({
    queryKey: ['/api/insights/spending-patterns'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
            <span>Spending Pattern Analysis</span>
          </CardTitle>
          <CardDescription>Analyzing your transaction history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertOctagon className="mr-2 h-5 w-5" />
            <span>Error Loading Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We encountered an error while analyzing your spending patterns. Please try again later.
          </p>
          <Button variant="outline" className="mt-4" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const patterns = patternsData?.patterns || {
    patterns: [],
    frequentMerchants: [],
    categoryTrends: [],
    unusualSpending: []
  } as PatternData;

  if (patterns.patterns.length === 0 && 
      patterns.frequentMerchants.length === 0 && 
      patterns.categoryTrends.length === 0 && 
      patterns.unusualSpending.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
            <span>Spending Pattern Analysis</span>
          </CardTitle>
          <CardDescription>Add more transactions to see patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We don't have enough data to analyze your spending patterns yet. Add more receipts and transactions to get personalized insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
          <span>Spending Pattern Analysis</span>
        </CardTitle>
        <CardDescription>AI-powered analysis of your financial behavior</CardDescription>
      </CardHeader>
      <CardContent>
        {patterns.patterns.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Patterns Detected</h3>
            <ul className="space-y-2">
              {patterns.patterns.slice(0, expanded ? undefined : 3).map((pattern: string, index: number) => (
                <li key={index} className="flex items-start">
                  <BadgeCheck className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm">{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {expanded && (
          <>
            {patterns.frequentMerchants.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">Most Frequent Merchants</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {patterns.frequentMerchants.map((merchant: MerchantData, index: number) => (
                    <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-blue-100">
                      <div className="font-medium text-sm">{merchant.name}</div>
                      <div className="text-xs text-gray-600">
                        {merchant.frequency} visits • {merchant.totalSpent}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {patterns.categoryTrends.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Category Spending Trends</h3>
                <div className="space-y-2">
                  {patterns.categoryTrends.map((trend: TrendData, index: number) => (
                    <div key={index} className="flex items-center">
                      {trend.direction === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-red-600 mr-2" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-600 mr-2" />
                      )}
                      <span className="text-sm">{trend.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {patterns.unusualSpending.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-semibold text-amber-700 mb-2">Unusual Spending</h3>
                <ul className="space-y-2">
                  {patterns.unusualSpending.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <AlertOctagon className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="text-center mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show Less" : "Show Detailed Analysis"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingPatterns;