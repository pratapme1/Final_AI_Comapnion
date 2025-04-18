import { useQuery } from "@tanstack/react-query";
import { formatCurrency, getBudgetStatusColor } from "@/lib/openai";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRightIcon, ChevronRightIcon, WalletIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const BudgetTracker = () => {
  const { data: budgetStatuses, isLoading } = useQuery({
    queryKey: ['/api/stats/budget-status'],
  });

  if (isLoading) {
    return (
      <Card className="shadow-md mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <WalletIcon className="h-5 w-5 mr-2 text-primary" />
            Budget Overview
          </CardTitle>
          <CardDescription>Track your spending against monthly limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get only up to 3 budgets for dashboard view
  const displayBudgets = budgetStatuses?.slice(0, 3) || [];
  const hasBudgets = displayBudgets.length > 0;
  const hasMoreBudgets = budgetStatuses && budgetStatuses.length > 3;

  return (
    <Card className="shadow-md mb-6 overflow-hidden border border-gray-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium flex items-center">
              <WalletIcon className="h-5 w-5 mr-2 text-primary" />
              Budget Overview
            </CardTitle>
            <CardDescription>Track your spending against monthly limits</CardDescription>
          </div>
          {hasMoreBudgets && (
            <Link href="/budgets">
              <Button variant="ghost" size="sm" className="text-primary">
                View all <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {hasBudgets ? (
          <div className="space-y-4">
            {displayBudgets.map((budget, index) => {
              const statusColor = getBudgetStatusColor(budget.percentage).replace('bg-', 'text-').replace('-500', '-600');
              const statusBgColor = getBudgetStatusColor(budget.percentage).replace('-500', '-100');
              
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-800">{budget.category}</span>
                      {budget.status === 'warning' && (
                        <span className="ml-2 text-xs text-amber-600 font-medium rounded-full px-2 py-0.5 bg-amber-50 border border-amber-200">
                          Near Limit
                        </span>
                      )}
                      {budget.status === 'exceeded' && (
                        <span className="ml-2 text-xs text-red-600 font-medium rounded-full px-2 py-0.5 bg-red-50 border border-red-200">
                          Exceeded
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      <span className={statusColor}>{formatCurrency(budget.spent)}</span>
                      <span className="text-gray-500"> / {formatCurrency(budget.limit)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                      className={`${getBudgetStatusColor(budget.percentage)} h-2.5 rounded-full transition-all duration-500 relative`}
                      style={{ width: `${Math.min(100, budget.percentage)}%` }}
                    >
                      {budget.percentage > 95 && (
                        <div className="absolute inset-0 bg-stripes-white opacity-30"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{budget.percentage}% used</span>
                    <span>{budget.daysLeft} days left</span>
                  </div>
                </div>
              );
            })}
            
            {/* Create new budget link */}
            <div className="pt-2 flex justify-center">
              <Link href="/budgets">
                <Button variant="outline" size="sm" className="text-sm">
                  <ArrowRightIcon className="h-3.5 w-3.5 mr-1" />
                  Manage Budgets
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gray-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <WalletIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-1">No budgets yet</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
              Set up monthly spending limits to help you stay on track with your financial goals.
            </p>
            <Link href="/budgets">
              <Button variant="outline" size="sm">
                Create Your First Budget
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetTracker;
