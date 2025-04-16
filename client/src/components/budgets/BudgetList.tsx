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
import { formatCurrency, getBudgetStatusColor, deleteBudget } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BudgetListProps {
  month: string;
  onEditBudget: (budgetId: number) => void;
}

const BudgetList = ({ month, onEditBudget }: BudgetListProps) => {
  const { toast } = useToast();
  const [budgetToDelete, setBudgetToDelete] = useState<number | null>(null);

  // Fetch budgets for the specified month
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['/api/budgets', { month }],
  });

  // Fetch budget statuses for progress tracking
  const { data: budgetStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['/api/stats/budget-status'],
  });

  // Handle budget deletion
  const handleDeleteBudget = async () => {
    if (budgetToDelete === null) return;
    
    try {
      await deleteBudget(budgetToDelete);
      
      toast({
        title: "Budget deleted",
        description: "The budget has been deleted successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'] });
      
      setBudgetToDelete(null);
    } catch (error) {
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
    if (!budgetStatuses) return null;
    
    return budgetStatuses.find(
      (status: any) => status.category === budget.category
    );
  };

  if (isLoading || statusesLoading) {
    return (
      <div className="space-y-4 py-2">
        <h2 className="text-lg font-medium mb-4">Budgets for {formatMonth(month)}</h2>
        {[...Array(5)].map((_, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const filteredBudgets = budgets?.filter((budget: any) => budget.month === month) || [];

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-lg font-medium mb-4">Budgets for {formatMonth(month)}</h2>
      
      {filteredBudgets.length > 0 ? (
        filteredBudgets.map((budget: any) => {
          const status = getBudgetWithStatus(budget);
          const percentage = status ? status.percentage : 0;
          const spent = status ? status.spent : 0;
          
          return (
            <div key={budget.id} className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700">{budget.category}</span>
                  {status && status.status === 'warning' && (
                    <span className="ml-1 text-xs text-warning font-medium rounded-full px-2 py-0.5 bg-yellow-100">
                      Near Limit
                    </span>
                  )}
                  {status && status.status === 'exceeded' && (
                    <span className="ml-1 text-xs text-danger font-medium rounded-full px-2 py-0.5 bg-red-100">
                      Exceeded
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {formatCurrency(spent)} / {formatCurrency(Number(budget.limit))}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onEditBudget(budget.id)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setBudgetToDelete(budget.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`${getBudgetStatusColor(percentage)} h-2.5 rounded-full`}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                ></div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No budgets set for {formatMonth(month)}.</p>
          <p className="text-sm mt-2">Create a budget to start tracking your spending.</p>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={budgetToDelete !== null} onOpenChange={() => setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBudget} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetList;
