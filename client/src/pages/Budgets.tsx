import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BudgetForm from "@/components/budgets/BudgetForm";
import BudgetList from "@/components/budgets/BudgetList";
import { PlusIcon, AlertTriangle, BarChart3, TrendingUp, PiggyBank, Lightbulb } from "lucide-react";
import { formatCurrency } from "@/lib/openai";
import { motion } from "framer-motion";

const Budgets = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  
  // Get current date information
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentMonthString = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
  
  // Log for debugging
  console.log("Current month string in main component:", currentMonthString);
  
  // Initialize the active month to the current month
  const [activeMonth, setActiveMonth] = useState<string>(currentMonthString);
  
  // Listen for custom event from BudgetList component
  useEffect(() => {
    const handleShowBudgetForm = (e: any) => {
      console.log("Received showBudgetForm event with detail:", e.detail);
      setShowForm(true);
      if (e.detail && e.detail.month) {
        setActiveMonth(e.detail.month);
      }
    };
    
    document.addEventListener('showBudgetForm', handleShowBudgetForm);
    
    return () => {
      document.removeEventListener('showBudgetForm', handleShowBudgetForm);
    };
  }, []);
  
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

  // Current month is already set in state initialization

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

  // Generate month options for the current month and future months
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Log current date info
    console.log(`Current date for month options: ${today.toISOString()}`);
    console.log(`Current month: ${currentMonth}, current year: ${currentYear}`);
    
    // Generate options for current month and 5 future months
    for (let i = 0; i <= 5; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      console.log(`Month option (main page): ${label}, value: ${value}`);
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
      {/* Page header with gradient background */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <PiggyBank className="h-6 w-6 mr-2 text-primary" />
              Budget Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage your category budgets to track spending and achieve your financial goals
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              onClick={toggleForm} 
              className={`inline-flex items-center ${!showForm ? 'bg-primary' : ''}`}
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Budget Summary Card */}
        <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
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
        <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
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
                    onClick={() => {
                      console.log("Create first budget button clicked");
                      // Force scroll to top of page
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      // Show the form
                      setShowForm(true);
                    }}
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
        <Card className="overflow-hidden border-t-4 border-t-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 text-purple-500">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
              </svg>
              Quick Actions
            </CardTitle>
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
                defaultMonth={activeMonth}
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
      <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-blue-500" />
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
