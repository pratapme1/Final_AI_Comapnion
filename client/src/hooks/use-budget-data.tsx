import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Budget Context Types
type Budget = {
  id: number;
  category: string;
  limit: string;
  month: string;
  userId: number;
};

type BudgetStatus = {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  status: 'normal' | 'warning' | 'exceeded';
};

type CategorySpending = {
  category: string;
  amount: number;
  color: string;
};

type BudgetContextType = {
  budgets: Budget[];
  budgetStatuses: BudgetStatus[];
  categorySpending: CategorySpending[];
  filteredBudgets: (month: string) => Budget[];
  getBudgetStatus: (category: string) => BudgetStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  createBudgetMutation: any;
  updateBudgetMutation: any;
  deleteBudgetMutation: any;
  invalidateData: () => Promise<void>;
};

export const BudgetContext = createContext<BudgetContextType | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch all budgets
  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    isError: budgetsError,
  } = useQuery<Budget[]>({
    queryKey: ['/api/budgets'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds while component is mounted
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Fetch budget statuses
  const {
    data: budgetStatuses = [],
    isLoading: statusesLoading,
    isError: statusesError,
  } = useQuery<BudgetStatus[]>({
    queryKey: ['/api/stats/budget-status'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 1000,
  });

  // Fetch category spending
  const {
    data: categorySpending = [],
    isLoading: spendingLoading,
    isError: spendingError,
  } = useQuery<CategorySpending[]>({
    queryKey: ['/api/stats/category-spending'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 1000,
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async ({ category, limit, month }: { category: string; limit: number; month: string }) => {
      const res = await apiRequest("POST", "/api/budgets", { category, limit, month });
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Budget created successfully",
        description: "Your budget has been created and is now active.",
      });
      await invalidateData();
    },
    onError: (error) => {
      console.error("Error creating budget:", error);
      toast({
        title: "Error creating budget",
        description: "There was a problem creating your budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, limit }: { id: number; limit: number }) => {
      const res = await apiRequest("PUT", `/api/budgets/${id}`, { limit });
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Budget updated successfully",
        description: "Your budget has been updated with the new amount.",
      });
      await invalidateData();
    },
    onError: (error) => {
      console.error("Error updating budget:", error);
      toast({
        title: "Error updating budget",
        description: "There was a problem updating your budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: async () => {
      toast({
        title: "Budget deleted",
        description: "The budget has been deleted successfully.",
      });
      await invalidateData();
    },
    onError: (error) => {
      console.error("Error deleting budget:", error);
      toast({
        title: "Error",
        description: "Failed to delete the budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to filter budgets by month
  const filteredBudgets = (month: string) => {
    return budgets.filter((budget) => budget.month === month);
  };

  // Helper function to get budget status by category
  const getBudgetStatus = (category: string) => {
    return budgetStatuses.find((status) => status.category === category);
  };

  // Function to invalidate all budget-related data
  const invalidateData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/budgets'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/stats'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/stats/category-spending'], refetchType: 'all' });
    
    // Force direct refetch
    await queryClient.refetchQueries({ queryKey: ['/api/budgets'], type: 'all' });
  };

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        budgetStatuses,
        categorySpending,
        filteredBudgets,
        getBudgetStatus,
        isLoading: budgetsLoading || statusesLoading || spendingLoading,
        isError: budgetsError || statusesError || spendingError,
        createBudgetMutation,
        updateBudgetMutation,
        deleteBudgetMutation,
        invalidateData,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgetData() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error("useBudgetData must be used within a BudgetProvider");
  }
  return context;
}