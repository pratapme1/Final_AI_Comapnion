import { formatCurrency } from "@/lib/openai";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { QueryClient } from "@tanstack/react-query";

// Define the Stats type interface for better type checking
interface Stats {
  totalSpend: number;
  budgetRemaining: number;
  potentialSavings: number;
  suggestionsCount: number;
  recurringExpenses: number;
  subscriptionsCount: number;
  spendingTrend: number;
}

const StatCards = () => {
  const { toast } = useToast();
  const [statsData, setStatsData] = useState<Stats>({
    totalSpend: 0,
    budgetRemaining: 0,
    potentialSavings: 0,
    suggestionsCount: 0,
    recurringExpenses: 0,
    subscriptionsCount: 0,
    spendingTrend: 0
  });
  
  const { data: stats, isLoading, error, refetch } = useQuery<Stats>({
    queryKey: ['/api/stats'],
    retry: 2,
    onSuccess: (data) => {
      console.log("Stats loaded successfully:", data);
    }
  });

  // Update local state when stats data is received
  useEffect(() => {
    if (stats) {
      console.log("Stats data received:", stats);
      console.log("Total spend value:", stats.totalSpend);
      console.log("Total spend type:", typeof stats.totalSpend);
      setStatsData(stats);
    }
    if (error) {
      console.error("Error fetching stats:", error);
    }
  }, [stats, error]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg p-5">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Spending Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Spending (This Month)
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {formatCurrency(statsData.totalSpend)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-danger font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {statsData.spendingTrend}%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </dd>
          </dl>
        </div>
      </div>

      {/* Budget Remaining Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Budget Remaining
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {formatCurrency(statsData.budgetRemaining)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-warning font-medium">
                {statsData.totalSpend && statsData.budgetRemaining 
                  ? `${Math.round((statsData.totalSpend / (statsData.totalSpend + statsData.budgetRemaining)) * 100)}% used` 
                  : '0% used'}
              </span>
              <span className="text-gray-500 ml-2">
                of {formatCurrency(statsData.totalSpend + statsData.budgetRemaining)}
              </span>
            </dd>
          </dl>
        </div>
      </div>

      {/* Potential Savings Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Potential Savings
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-secondary">
              {formatCurrency(statsData.potentialSavings)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-secondary font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {statsData.suggestionsCount} suggestions
              </span>
            </dd>
          </dl>
        </div>
      </div>

      {/* Recurring Expenses Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Recurring Expenses
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {formatCurrency(statsData.recurringExpenses)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-gray-500">
                {statsData.subscriptionsCount} subscriptions
              </span>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatCards;
