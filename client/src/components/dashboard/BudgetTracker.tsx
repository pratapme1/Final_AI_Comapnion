import { useQuery } from "@tanstack/react-query";
import { formatCurrency, getBudgetStatusColor } from "@/lib/openai";
import { Skeleton } from "@/components/ui/skeleton";

const BudgetTracker = () => {
  const { data: budgetStatuses, isLoading } = useQuery({
    queryKey: ['/api/stats/budget-status'],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Budget Status</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Budget Status</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {budgetStatuses && budgetStatuses.length > 0 ? (
              budgetStatuses.map((budget, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700">{budget.category}</span>
                      {budget.status === 'warning' && (
                        <span className="ml-1 text-xs text-warning font-medium rounded-full px-2 py-0.5 bg-yellow-100">
                          Near Limit
                        </span>
                      )}
                      {budget.status === 'exceeded' && (
                        <span className="ml-1 text-xs text-danger font-medium rounded-full px-2 py-0.5 bg-red-100">
                          Exceeded
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`${getBudgetStatusColor(budget.percentage)} h-2.5 rounded-full`}
                      style={{ width: `${Math.min(100, budget.percentage)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No budget data available. Set up your budgets to track your spending.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;
