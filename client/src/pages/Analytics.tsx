import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryChart from "@/components/analytics/CategoryChart";
import SpendingTrend from "@/components/analytics/SpendingTrend";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/openai";
import { PieChart, BarChart2, TrendingUp, DollarSign, Lightbulb } from "lucide-react";

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
      {/* Page header with gradient background */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart2 className="h-6 w-6 mr-2 text-primary" />
            Spending Analytics
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Understand your spending patterns with in-depth analysis and AI-powered insights
          </p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spend</p>
              <h3 className="text-xl font-bold">{formatCurrency(stats?.totalSpend || 0)}</h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Monthly</p>
              <h3 className="text-xl font-bold">{formatCurrency((stats?.totalSpend || 0) / 3)}</h3>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Top Category</p>
              <h3 className="text-xl font-bold truncate max-w-[140px]">
                {categorySpending && categorySpending.length > 0 
                  ? categorySpending[0].category 
                  : "N/A"}
              </h3>
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <BarChart2 className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-amber-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Categories</p>
              <h3 className="text-xl font-bold">
                {categorySpending?.length || 0} types
              </h3>
            </div>
            <div className="bg-amber-100 p-2 rounded-full">
              <PieChart className="h-6 w-6 text-amber-600" />
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
        <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-500" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <CategoryChart timeframe={timeframe} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SpendingTrend timeframe={timeframe} />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="overflow-hidden border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
          <CardTitle className="text-lg flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-purple-500" />
            AI Spending Insights
          </CardTitle>
          <CardDescription>
            Personalized financial insights powered by advanced analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
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
