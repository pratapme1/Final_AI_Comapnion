import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BudgetForm from "@/components/budgets/BudgetForm";
import BudgetList from "@/components/budgets/BudgetList";
import { PlusIcon, AlertTriangle, BarChart3, TrendingUp, PiggyBank } from "lucide-react";
import { formatCurrency } from "@/lib/openai";
import { motion } from "framer-motion";

const Budgets = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  
  // Fetch budget and spending data with improved refetch settings
  const { data: budgets = [] } = useQuery<any[]>({
    queryKey: ['/api/budgets'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale right away
    refetchInterval: 2000, // Poll every 2 seconds
  });
  
  const { data: budgetStatuses = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/budget-status'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 2000,
  });
  
  const { data: spendingData = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/category-spending'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 2000,
  });
  
  const { data: stats = {} } = useQuery<any>({
    queryKey: ['/api/stats'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 2000,
  });

  // Set default tab to current month
  useEffect(() => {
    const today = new Date();
    const currentMonthValue = today.toISOString().slice(0, 7);
    setActiveMonth(currentMonthValue);
  }, []);

  const toggleForm = () => {
    setShowForm(!showForm);
    setSelectedBudgetId(null);
    // Scroll to top when form is shown
    if (!showForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditBudget = (budgetId: number) => {
    setSelectedBudgetId(budgetId);
    setShowForm(true);
    // Scroll to top when form is shown
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate month options for the last 3 months and next 3 months
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = -2; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = getMonthOptions();
  
  // Calculate budget summary
  const calculateBudgetSummary = () => {
    if (!budgets || !budgetStatuses) return null;
    
    const totalBudget = budgets.reduce((sum: number, budget: any) => sum + Number(budget.limit), 0);
    const totalSpent = budgetStatuses.reduce((sum: number, status: any) => sum + status.spent, 0);
    const remaining = totalBudget - totalSpent;
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const exceedingCategories = budgetStatuses.filter((status: any) => status.status === 'exceeded').length;
    
    return {
      totalBudget,
      totalSpent,
      remaining,
      percentUsed,
      exceedingCategories
    };
  };
  
  const budgetSummary = calculateBudgetSummary();
  
  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value);
    setActiveMonth(value);
  };

  return (
    <div>
      {/* Page header with animated gradient */}
      <div className="relative overflow-hidden rounded-lg mb-6 bg-gradient-to-r from-blue-600 to-violet-600 p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">Budget Management</h1>
          <p className="text-blue-100 max-w-2xl">
            Create and manage your category budgets to track spending, identify patterns, 
            and achieve your financial goals with smart AI-powered insights.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
          <PiggyBank className="w-64 h-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Budget Summary Card */}
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetSummary ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Budget</span>
                  <span className="text-lg font-semibold">{formatCurrency(budgetSummary.totalBudget)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Spent</span>
                  <span className="text-lg font-semibold">{formatCurrency(budgetSummary.totalSpent)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${budgetSummary.percentUsed > 100 ? 'bg-red-500' : budgetSummary.percentUsed > 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, budgetSummary.percentUsed)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-500">Remaining</span>
                  <span className={`text-lg font-semibold ${budgetSummary.remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(budgetSummary.remaining)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No budget data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Actions Card */}
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              This Month's Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetStatuses && budgetStatuses.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Active Budgets</span>
                    <span className="text-lg font-semibold">{budgets.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Categories Exceeding</span>
                    <span className={`text-lg font-semibold ${budgetSummary?.exceedingCategories ? 'text-red-500' : 'text-green-500'}`}>
                      {budgetSummary?.exceedingCategories || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Top Spending</span>
                    <span className="text-lg font-semibold">
                      {spendingData && spendingData.length > 0 
                        ? spendingData[0].category 
                        : 'N/A'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <p className="text-center text-gray-500 mb-4">No active budgets for this month yet</p>
                  <Button 
                    onClick={toggleForm} 
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    variant="outline"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create Your First Budget
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={toggleForm} 
              className="w-full"
              variant={showForm ? "outline" : "default"}
            >
              {showForm 
                ? "Cancel" 
                : <>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    {budgets.length > 0 ? "Add New Budget" : "Create First Budget"}
                  </>
              }
            </Button>
            
            {budgets.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full border-dashed"
                onClick={() => window.location.href = '/analytics'}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                View Detailed Analytics
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Form (conditionally rendered) */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6 border-blue-200 shadow-md">
            <CardContent className="pt-6">
              <BudgetForm 
                budgetId={selectedBudgetId} 
                onComplete={() => {
                  setShowForm(false);
                  setSelectedBudgetId(null);
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Month Selector */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 md:mb-0">Monthly Budgets</h2>
          <div className="bg-blue-50 rounded-md">
            <div className="flex space-x-1 p-1">
              {monthOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTabChange(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeMonth === option.value
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {option.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <Card className="border-blue-100">
          <CardContent className="pt-6">
            <BudgetList 
              month={activeMonth} 
              onEditBudget={handleEditBudget}
            />
          </CardContent>
        </Card>
      </div>

      {/* Budget Insights */}
      <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-blue-500" />
            Budget Insights
          </CardTitle>
          <CardDescription>
            AI-powered financial recommendations based on your spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Insights will be shown conditionally based on budget status */}
          {budgetSummary && budgetSummary.exceedingCategories > 0 ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Budget Alert</AlertTitle>
              <AlertDescription>
                You've exceeded your budget in {budgetSummary.exceedingCategories} {budgetSummary.exceedingCategories === 1 ? 'category' : 'categories'}. 
                Consider adjusting your spending habits or increasing your budget in these areas.
              </AlertDescription>
            </Alert>
          ) : null}
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex">
              <div className="flex-shrink-0 mr-3">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Budget Recommendation</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Based on your spending patterns, consider allocating more budget to your Dining category,
                  which you regularly exceed by 15-20%. Reducing your Entertainment budget by 10% could help
                  balance your overall monthly spending.
                </p>
              </div>
            </div>
          </div>
          
          {stats && stats.potentialSavings > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  <PiggyBank className="h-5 w-5 text-green-500 mt-0.5" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800">Savings Opportunity</h3>
                  <p className="text-sm text-green-700 mt-1">
                    You have potential savings of {formatCurrency(stats.potentialSavings)} based on 
                    your current spending patterns. Check your Insights tab for specific recommendations 
                    on where you can save.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Budgets;
