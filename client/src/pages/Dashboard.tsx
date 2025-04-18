import StatCards from "@/components/dashboard/StatCards";
import BudgetTracker from "@/components/dashboard/BudgetTracker";
import TransactionList from "@/components/dashboard/TransactionList";
import InsightsList from "@/components/dashboard/InsightsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  ArrowRightIcon, 
  BarChart4Icon, 
  LightbulbIcon, 
  PiggyBankIcon, 
  PlusIcon, 
  ReceiptIcon, 
  SparklesIcon 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/openai";

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    retry: 2
  });

  return (
    <div className="space-y-6">
      {/* Page header with gradient background */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 mr-2 text-primary" />
              Smart Financial Overview
            </h1>
            <p className="text-sm text-gray-600 mt-1">Your AI-powered financial snapshot for April 2025</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <Link href="/insights">
              <Button variant="outline" className="inline-flex items-center">
                <LightbulbIcon className="mr-2 h-4 w-4 text-amber-500" />
                All Insights
              </Button>
            </Link>
            <Link href="/receipts/upload">
              <Button className="inline-flex items-center bg-primary">
                <PlusIcon className="mr-2 h-4 w-4" />
                Upload Receipt
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards with updated design */}
      <StatCards />

      {/* Key Financial Sections - 3 column layout with colorful cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Budget Snapshot */}
        <Card className="overflow-hidden border-t-4 border-t-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <PiggyBankIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Budget Snapshot
                </h3>
                <p className="text-sm text-gray-500 mt-1">Remaining: {stats && formatCurrency(stats.budgetRemaining)}</p>
              </div>
              <Link href="/budgets">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-0 h-8 w-8">
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="overflow-hidden border-t-4 border-t-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <ReceiptIcon className="h-5 w-5 mr-2 text-green-500" />
                  Recent Activity
                </h3>
                <p className="text-sm text-gray-500 mt-1">Total: {stats && formatCurrency(stats.totalSpend)}</p>
              </div>
              <Link href="/receipts">
                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800 hover:bg-green-50 p-0 h-8 w-8">
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="overflow-hidden border-t-4 border-t-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <BarChart4Icon className="h-5 w-5 mr-2 text-purple-500" />
                  Spending Analytics
                </h3>
                <p className="text-sm text-gray-500 mt-1">View detailed reports</p>
              </div>
              <Link href="/analytics">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-0 h-8 w-8">
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview - Simplified */}
      <BudgetTracker />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions - More focused */}
        <TransactionList />

        {/* Insights and Recommendations */}
        <InsightsList />
      </div>

      {/* Footer with advice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mt-8 border border-blue-100">
        <div className="flex items-start">
          <div className="bg-white p-2 rounded-full shadow-sm mr-4">
            <SparklesIcon className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-900">AI-Powered Finance Assistant</h3>
            <p className="text-sm text-gray-600 mt-1">
              Smart Ledger is continuously analyzing your financial data to provide personalized insights.
              Visit the <Link href="/insights"><span className="text-primary font-medium">Insights page</span></Link> for detailed analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
