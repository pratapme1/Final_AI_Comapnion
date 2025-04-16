import { formatCurrency } from "@/lib/openai";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const StatCards = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats'],
  });

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
              {formatCurrency(stats?.totalSpend || 0)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-danger font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {stats?.spendingTrend || 0}%
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
              {formatCurrency(stats?.budgetRemaining || 0)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-warning font-medium">
                {stats?.totalSpend && stats?.budgetRemaining 
                  ? `${Math.round((stats.totalSpend / (stats.totalSpend + stats.budgetRemaining)) * 100)}% used` 
                  : '0% used'}
              </span>
              <span className="text-gray-500 ml-2">
                of {formatCurrency((stats?.totalSpend || 0) + (stats?.budgetRemaining || 0))}
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
              {formatCurrency(stats?.potentialSavings || 0)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-secondary font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {stats?.suggestionsCount || 0} suggestions
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
              {formatCurrency(stats?.recurringExpenses || 0)}
            </dd>
            <dd className="mt-2 flex items-center text-sm">
              <span className="text-gray-500">
                {stats?.subscriptionsCount || 0} subscriptions
              </span>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatCards;
