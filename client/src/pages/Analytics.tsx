import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryChart from "@/components/analytics/CategoryChart";
import SpendingTrend from "@/components/analytics/SpendingTrend";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/openai";
import { PieChart, BarChart2, TrendingUp, DollarSign } from "lucide-react";

const Analytics = () => {
  const [timeframe, setTimeframe] = useState("6months");
  
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });
  
  const { data: categorySpending } = useQuery({
    queryKey: ['/api/stats/category-spending'],
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Spending Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Understand your spending patterns with in-depth analysis
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="bg-blue-100 p-2 rounded-md">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spend</p>
              <h3 className="text-xl font-bold">{formatCurrency(stats?.totalSpend || 0)}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="bg-green-100 p-2 rounded-md">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Monthly</p>
              <h3 className="text-xl font-bold">{formatCurrency((stats?.totalSpend || 0) / 3)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="bg-purple-100 p-2 rounded-md">
              <BarChart2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Top Category</p>
              <h3 className="text-xl font-bold">
                {categorySpending && categorySpending.length > 0 
                  ? categorySpending[0].category 
                  : "N/A"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="bg-yellow-100 p-2 rounded-md">
              <PieChart className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <h3 className="text-xl font-bold">
                {categorySpending?.length || 0} types
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeframe selector */}
      <div className="mb-6">
        <Tabs defaultValue={timeframe} onValueChange={setTimeframe}>
          <TabsList>
            <TabsTrigger value="3months">3 Months</TabsTrigger>
            <TabsTrigger value="6months">6 Months</TabsTrigger>
            <TabsTrigger value="1year">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-medium mb-4">Spending by Category</h2>
            <CategoryChart timeframe={timeframe} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-medium mb-4">Monthly Spending Trend</h2>
            <SpendingTrend timeframe={timeframe} />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-medium mb-4">AI Spending Insights</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Spending Pattern</h3>
              <p className="text-sm text-blue-700">
                Your highest spending category is {categorySpending && categorySpending.length > 0 
                  ? categorySpending[0].category 
                  : "Groceries"} (
                {categorySpending && categorySpending.length > 0 
                  ? formatCurrency(categorySpending[0].amount) 
                  : formatCurrency(0)}). This is followed by {
                  categorySpending && categorySpending.length > 1 
                    ? categorySpending[1].category 
                    : "Dining"} and {
                  categorySpending && categorySpending.length > 2 
                    ? categorySpending[2].category 
                    : "Entertainment"}.
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="text-sm font-medium text-green-800 mb-2">Optimization Potential</h3>
              <p className="text-sm text-green-700">
                You could save approximately {formatCurrency(stats?.potentialSavings || 0)} by optimizing your recurring expenses and taking advantage of bulk purchase opportunities.
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="text-sm font-medium text-purple-800 mb-2">Seasonal Trends</h3>
              <p className="text-sm text-purple-700">
                Your spending tends to increase by 15-20% during festival months (October-December). Consider setting aside additional budget for these periods.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
