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
      <div className="rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 p-6 mb-8 border border-blue-100 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text flex items-center">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md mr-3">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              Smart Financial Overview
            </h1>
            <p className="text-sm text-gray-600 mt-1 ml-11">Your AI-powered financial snapshot for April 2025</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <Link href="/insights">
              <Button variant="outline" className="inline-flex items-center border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 transition-all duration-200">
                <LightbulbIcon className="mr-2 h-4 w-4 text-amber-500" />
                All Insights
              </Button>
            </Link>
            <Link href="/receipts/upload">
              <Button className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
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
        <Card className="overflow-hidden bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium text-blue-700 flex items-center">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg shadow-sm mr-2">
                    <PiggyBankIcon className="h-4 w-4 text-white" />
                  </div>
                  Budget Snapshot
                </h3>
                <p className="text-sm text-blue-600/80 mt-2 ml-9 font-medium">
                  Remaining: {stats && formatCurrency(stats.budgetRemaining)}
                </p>
              </div>
              <Link href="/budgets">
                <Button variant="ghost" size="sm" className="text-blue-600 bg-blue-50/50 hover:text-blue-800 hover:bg-blue-100 p-0 h-8 w-8 rounded-full shadow-sm group-hover:shadow-md transition-all duration-300">
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="overflow-hidden bg-gradient-to-br from-white to-teal-50/30 border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-teal-600"></div>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium text-teal-700 flex items-center">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-1.5 rounded-lg shadow-sm mr-2">
                    <ReceiptIcon className="h-4 w-4 text-white" />
                  </div>
                  Recent Activity
                </h3>
                <p className="text-sm text-teal-600/80 mt-2 ml-9 font-medium">
                  Total: {stats && formatCurrency(stats.totalSpend)}
                </p>
              </div>
              <Link href="/receipts">
                <Button variant="ghost" size="sm" className="text-teal-600 bg-teal-50/50 hover:text-teal-800 hover:bg-teal-100 p-0 h-8 w-8 rounded-full shadow-sm group-hover:shadow-md transition-all duration-300">
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="overflow-hidden bg-gradient-to-br from-white to-purple-50/30 border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium text-purple-700 flex items-center">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg shadow-sm mr-2">
                    <BarChart4Icon className="h-4 w-4 text-white" />
                  </div>
                  Spending Analytics
                </h3>
                <p className="text-sm text-purple-600/80 mt-2 ml-9 font-medium">
                  View detailed reports
                </p>
              </div>
              <Link href="/analytics">
                <Button variant="ghost" size="sm" className="text-purple-600 bg-purple-50/50 hover:text-purple-800 hover:bg-purple-100 p-0 h-8 w-8 rounded-full shadow-sm group-hover:shadow-md transition-all duration-300">
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
      <div className="bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl p-6 mt-8 border border-indigo-200 shadow-md">
        <div className="flex items-start">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg shadow-md mr-4">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">AI-Powered Finance Assistant</h3>
            <p className="text-sm text-gray-700 mt-2">
              Smart Ledger is continuously analyzing your financial data to provide personalized insights.
              Visit the <Link href="/insights"><span className="text-blue-600 hover:text-indigo-600 font-medium transition-colors duration-200">Insights page</span></Link> for detailed analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
