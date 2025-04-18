import { formatCurrency } from "@/lib/openai";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  BadgeIndianRupeeIcon, 
  CircleDollarSignIcon, 
  CreditCardIcon, 
  SparklesIcon
} from "lucide-react";

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
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
    retry: 2
  });

  const [statsData, setStatsData] = useState<Stats>({
    totalSpend: 0,
    budgetRemaining: 0,
    potentialSavings: 0,
    suggestionsCount: 0,
    recurringExpenses: 0,
    subscriptionsCount: 0,
    spendingTrend: 0
  });
  
  useEffect(() => {
    if (stats) {
      setStatsData(stats);
    }
  }, [stats]);

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

  const getPercentUsedColor = (totalSpend: number, budgetRemaining: number) => {
    const percentUsed = Math.round((totalSpend / (totalSpend + budgetRemaining)) * 100);
    if (percentUsed > 90) return "text-red-600";
    if (percentUsed > 70) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Spending Card - Blue */}
      <div className="overflow-hidden shadow-md rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div className="bg-blue-500 p-2 rounded-lg shadow-sm">
              <BadgeIndianRupeeIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded-full shadow-sm">
              {statsData.spendingTrend > 0 ? (
                <ArrowUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 mr-1" />
              )}
              {Math.abs(statsData.spendingTrend)}% vs last month
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-blue-700">Spending</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(statsData.totalSpend)}
              </p>
              <p className="ml-2 text-sm font-medium text-blue-600">this month</p>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <div className="w-full bg-blue-100 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <p className="ml-3 text-xs whitespace-nowrap text-blue-600">
                {formatCurrency(statsData.totalSpend)} / ₹10,000
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Card - Green */}
      <div className="overflow-hidden shadow-md rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div className="bg-green-500 p-2 rounded-lg shadow-sm">
              <CircleDollarSignIcon className="h-5 w-5 text-white" />
            </div>
            <div className={`flex items-center text-xs font-medium ${getPercentUsedColor(statsData.totalSpend, statsData.budgetRemaining)} bg-white px-2 py-1 rounded-full shadow-sm`}>
              {statsData.budgetRemaining > 0 
                  ? `${Math.round((statsData.totalSpend / (statsData.totalSpend + statsData.budgetRemaining)) * 100)}% used` 
                  : '0% used'}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-green-700">Budget Remaining</h3>
            <p className="mt-2 text-3xl font-bold text-green-900">
              {formatCurrency(statsData.budgetRemaining)}
            </p>
            <p className="mt-2 text-xs text-green-600">
              of {formatCurrency(statsData.totalSpend + statsData.budgetRemaining)} total budget
            </p>
          </div>
        </div>
      </div>

      {/* Potential Savings - Purple */}
      <div className="overflow-hidden shadow-md rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div className="bg-purple-500 p-2 rounded-lg shadow-sm">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center text-xs font-medium text-purple-600 bg-white px-2 py-1 rounded-full shadow-sm">
              {statsData.suggestionsCount} opportunities
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-purple-700">Potential Savings</h3>
            <p className="mt-2 text-3xl font-bold text-purple-900">
              {formatCurrency(statsData.potentialSavings)}
            </p>
            <p className="mt-2 text-xs text-purple-600">
              AI-suggested savings opportunities
            </p>
          </div>
        </div>
      </div>

      {/* Recurring Expenses - Amber */}
      <div className="overflow-hidden shadow-md rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div className="bg-amber-500 p-2 rounded-lg shadow-sm">
              <CreditCardIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center text-xs font-medium text-amber-600 bg-white px-2 py-1 rounded-full shadow-sm">
              {statsData.subscriptionsCount} subscriptions
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-amber-700">Recurring Expenses</h3>
            <p className="mt-2 text-3xl font-bold text-amber-900">
              {formatCurrency(statsData.recurringExpenses)}
            </p>
            <p className="mt-2 text-xs text-amber-600">
              Monthly recurring payments
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCards;
