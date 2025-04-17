import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getBudgetStatusColor, deleteBudget } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Edit, 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  DollarSign, 
  Percent, 
  PiggyBank 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface BudgetListProps {
  month: string;
  onEditBudget: (budgetId: number) => void;
}

const BudgetList = ({ month, onEditBudget }: BudgetListProps) => {
  const { toast } = useToast();
  const [budgetToDelete, setBudgetToDelete] = useState<number | null>(null);
  const [expandedBudget, setExpandedBudget] = useState<number | null>(null);

  // Fetch all budgets
  const { data: allBudgets = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/budgets'],
  });

  // Fetch budget statuses for progress tracking
  const { data: budgetStatuses = [], isLoading: statusesLoading } = useQuery<any[]>({
    queryKey: ['/api/stats/budget-status'],
  });
  
  // Log the month parameter and budgets
  console.log("BudgetList component received month:", month);
  console.log("All budgets:", allBudgets);

  // Handle budget deletion
  const handleDeleteBudget = async () => {
    if (budgetToDelete === null) return;
    
    try {
      await deleteBudget(budgetToDelete);
      
      toast({
        title: "Budget deleted",
        description: "The budget has been deleted successfully.",
      });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      setBudgetToDelete(null);
      
      // Remove expanded state if the deleted budget was expanded
      if (expandedBudget === budgetToDelete) {
        setExpandedBudget(null);
      }
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast({
        title: "Error",
        description: "Failed to delete the budget. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Merge budget data with status data
  const getBudgetWithStatus = (budget: any) => {
    if (!budgetStatuses || !Array.isArray(budgetStatuses)) return null;
    
    return budgetStatuses.find(
      (status: any) => status.category === budget.category
    );
  };

  // Get status icon based on percentage
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    } else if (percentage >= 80) {
      return <TrendingUp className="h-5 w-5 text-yellow-500" />;
    } else if (percentage >= 50) {
      return <TrendingUp className="h-5 w-5 text-blue-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  // Toggle expanded budget
  const toggleBudgetExpansion = (budgetId: number) => {
    if (expandedBudget === budgetId) {
      setExpandedBudget(null);
    } else {
      setExpandedBudget(budgetId);
    }
  };

  // Calculate days left in current month
  const getDaysLeftInMonth = () => {
    const [year, monthStr] = month.split('-');
    const monthNum = parseInt(monthStr, 10) - 1;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // If we're displaying the current month
    if (parseInt(year) === currentYear && monthNum === currentMonth) {
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const currentDay = today.getDate();
      return lastDay - currentDay;
    }
    
    // For future months, return the total days in that month
    if (parseInt(year) > currentYear || 
        (parseInt(year) === currentYear && monthNum > currentMonth)) {
      return new Date(parseInt(year), monthNum + 1, 0).getDate();
    }
    
    // For past months, return 0
    return 0;
  };

  // Get daily budget based on remaining days
  const getDailyBudget = (budget: any, status: any) => {
    if (!status) return null;
    
    const daysLeft = getDaysLeftInMonth();
    if (daysLeft <= 0) return null;
    
    const remainingBudget = Number(budget.limit) - status.spent;
    if (remainingBudget <= 0) return 0;
    
    return remainingBudget / daysLeft;
  };

  if (isLoading || statusesLoading) {
    return (
      <div className="space-y-6 py-2">
        <div className="flex items-center mb-6">
          <PiggyBank className="mr-2 h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium">Budgets for {formatMonth(month)}</h2>
        </div>
        
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="overflow-hidden border-blue-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-3 w-full mb-3" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filter budgets for the selected month
  const filteredBudgets = allBudgets.filter((budget: any) => budget.month === month) || [];
  console.log("Filtered budgets for month", month, ":", filteredBudgets);
  const daysLeftInMonth = getDaysLeftInMonth();
  const isCurrentMonth = daysLeftInMonth > 0;

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="flex items-center">
          <PiggyBank className="mr-2 h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium">Budgets for {formatMonth(month)}</h2>
        </div>
        
        {isCurrentMonth && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
            <CalendarIndicator daysLeft={daysLeftInMonth} />
          </Badge>
        )}
      </div>
      
      {filteredBudgets.length > 0 ? (
        <div className="space-y-4">
          {filteredBudgets.map((budget: any) => {
            const status = getBudgetWithStatus(budget);
            const percentage = status ? status.percentage : 0;
            const spent = status ? status.spent : 0;
            const remaining = Number(budget.limit) - spent;
            const isExpanded = expandedBudget === budget.id;
            const dailyBudget = getDailyBudget(budget, status);
            
            return (
              <motion.div 
                key={budget.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.01 }}
                className="relative"
              >
                <Card 
                  className={`border overflow-hidden cursor-pointer transition-all duration-300
                    ${isExpanded ? 'border-blue-300 shadow-md' : 'border-blue-100'}`}
                  onClick={() => toggleBudgetExpansion(budget.id)}
                >
                  <CardContent className="p-4">
                    {/* Header with category and actions */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <span className="text-base font-semibold text-gray-800">{budget.category}</span>
                        
                        {status && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="ml-2">
                                  {status.status === 'warning' && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> 
                                      Near Limit
                                    </Badge>
                                  )}
                                  {status.status === 'exceeded' && (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      <TrendingDown className="h-3 w-3 mr-1" /> 
                                      Exceeded
                                    </Badge>
                                  )}
                                  {status.status === 'normal' && percentage > 0 && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" /> 
                                      On Track
                                    </Badge>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{percentage}% of budget used</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBudget(budget.id);
                          }}
                          className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBudgetToDelete(budget.id);
                          }}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Budget progress bar */}
                    <div className="relative mb-2">
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, percentage)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`${getBudgetStatusColor(percentage)} h-2.5 rounded-full`}
                        />
                      </div>
                      
                      {/* 100% marker */}
                      <div className="absolute top-0 bottom-0 right-0 w-px bg-gray-400"></div>
                    </div>
                    
                    {/* Budget stats */}
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
                        <span className="font-medium text-gray-700">
                          {formatCurrency(spent)} <span className="text-gray-400">of</span> {formatCurrency(Number(budget.limit))}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Percent className="h-4 w-4 text-gray-500 mr-1" />
                        <span className={`font-medium ${
                          percentage >= 100 ? 'text-red-600' : 
                          percentage >= 80 ? 'text-yellow-600' : 
                          'text-blue-600'
                        }`}>
                          {Math.round(percentage)}% used
                        </span>
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pt-4 border-t border-blue-100"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-blue-600 mb-1">Remaining</p>
                            <p className={`text-xl font-bold ${remaining < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                              {formatCurrency(Math.max(0, remaining))}
                            </p>
                            {remaining < 0 && (
                              <p className="text-xs text-red-500 mt-1">
                                Over by {formatCurrency(Math.abs(remaining))}
                              </p>
                            )}
                          </div>
                          
                          {isCurrentMonth && dailyBudget !== null && (
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                              <p className="text-xs text-green-600 mb-1">Daily Budget</p>
                              <p className="text-xl font-bold text-green-700">
                                {formatCurrency(dailyBudget)}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                for next {daysLeftInMonth} days
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Spending advice */}
                        {isCurrentMonth && (
                          <div className="mt-3 text-sm">
                            {percentage >= 100 ? (
                              <p className="text-red-600">
                                <AlertTriangle className="inline h-3 w-3 mr-1" />
                                You've exceeded this budget. Consider adjusting your spending habits.
                              </p>
                            ) : percentage >= 80 ? (
                              <p className="text-yellow-600">
                                <AlertTriangle className="inline h-3 w-3 mr-1" />
                                You're close to your budget limit. Be mindful of additional expenses.
                              </p>
                            ) : percentage >= 50 ? (
                              <p className="text-blue-600">
                                <TrendingUp className="inline h-3 w-3 mr-1" />
                                You're on track with your budget. Keep it up!
                              </p>
                            ) : (
                              <p className="text-green-600">
                                <CheckCircle className="inline h-3 w-3 mr-1" />
                                You're well within your budget for this month.
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <PiggyBank className="h-12 w-12 text-blue-300 mb-4" />
            <h3 className="text-lg font-medium text-blue-800 mb-2">No budgets for {formatMonth(month)}</h3>
            <p className="text-blue-600 max-w-md mb-6">
              Create a budget to start tracking your spending and get personalized financial insights.
            </p>
            <Button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={budgetToDelete !== null} onOpenChange={() => setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone and all tracking for this category will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBudget} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Calendar indicator component
const CalendarIndicator = ({ daysLeft }: { daysLeft: number }) => {
  return (
    <div className="flex items-center">
      <span className="font-medium mr-1">{daysLeft}</span> days left in month
    </div>
  );
};

export default BudgetList;
