import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertOctagon, Clock, Calendar, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface RecurringExpense {
  name: string;
  amount: number;
  category: string;
  frequency: string;
  nextDate: string;
  confidence: number;
  merchant: string;
  lastSeen: string;
}

const RecurringExpenses = () => {
  const [expanded, setExpanded] = useState(false);

  interface RecurringExpensesResponse {
    recurringExpenses: RecurringExpense[];
  }
  
  const { data, isLoading, error } = useQuery<RecurringExpensesResponse>({
    queryKey: ['/api/insights/recurring-expenses'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 text-purple-600" />
            <span>Recurring Expenses</span>
          </CardTitle>
          <CardDescription>Analyzing your recurring payments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertOctagon className="mr-2 h-5 w-5" />
            <span>Error Loading Recurring Expenses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We encountered an error while analyzing your recurring expenses. Please try again later.
          </p>
          <Button variant="outline" className="mt-4" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const recurringExpenses = data?.recurringExpenses || [] as RecurringExpense[];

  if (recurringExpenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 text-purple-600" />
            <span>Recurring Expenses</span>
          </CardTitle>
          <CardDescription>No recurring expenses detected</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We haven't detected any recurring expenses in your transaction history yet. This could be because:
          </p>
          <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 space-y-1">
            <li>You haven't added enough transactions yet</li>
            <li>Your recurring expenses haven't appeared multiple times</li>
            <li>Your subscriptions might be billed irregularly</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  // Sort recurring expenses by amount (descending)
  const sortedExpenses = [...recurringExpenses].sort((a, b) => b.amount - a.amount);
  const displayExpenses = expanded ? sortedExpenses : sortedExpenses.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <RefreshCw className="mr-2 h-5 w-5 text-purple-600" />
          <span>Recurring Expenses</span>
        </CardTitle>
        <CardDescription>Detected subscriptions and regular payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayExpenses.map((expense, index) => (
            <div 
              key={index} 
              className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between"
            >
              <div className="flex-grow">
                <div className="flex items-start">
                  <Clock className="h-4 w-4 text-purple-600 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-purple-900">
                      {expense.name}{expense.merchant ? ` - ${expense.merchant}` : ''}
                    </h4>
                    <div className="text-xs text-gray-600 mt-1">
                      <div className="flex items-center mt-1">
                        <DollarSign className="h-3 w-3 mr-1" />
                        <span className="font-medium">{typeof expense.amount === 'number' ? `₹${expense.amount.toFixed(2)}` : expense.amount}</span>
                        <span className="mx-1">•</span>
                        <span>{expense.frequency}</span>
                        <span className="mx-1">•</span>
                        <span>{expense.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {expense.nextDate && (
                <div className="mt-2 md:mt-0 flex items-center bg-white py-1 px-2 rounded border border-purple-200">
                  <Calendar className="h-3 w-3 text-purple-600 mr-1" />
                  <span className="text-xs">
                    Next: {format(new Date(expense.nextDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {recurringExpenses.length > 3 && (
          <div className="text-center mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show Less" : `Show All (${recurringExpenses.length})`}
            </Button>
          </div>
        )}

        <div className="mt-6 bg-gray-50 p-3 rounded-md text-xs text-gray-600">
          <p>
            <span className="font-medium">Note:</span> Recurring expenses are automatically detected based on your transaction history. 
            The predicted next payment date is an estimate based on your previous transactions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringExpenses;