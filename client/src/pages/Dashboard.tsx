import StatCards from "@/components/dashboard/StatCards";
import BudgetTracker from "@/components/dashboard/BudgetTracker";
import TransactionList from "@/components/dashboard/TransactionList";
import InsightsList from "@/components/dashboard/InsightsList";
import SpendingChart from "@/components/dashboard/SpendingChart";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusIcon } from "lucide-react";

const Dashboard = () => {
  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your AI-powered financial insights</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center">
          <Link href="/receipts/upload">
            <Button className="inline-flex items-center">
              <PlusIcon className="mr-2 h-4 w-4" />
              Upload Receipt
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatCards />

      {/* Budget Overview */}
      <BudgetTracker />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <TransactionList />

        {/* Insights and Recommendations */}
        <InsightsList />
      </div>

      {/* Spend Analysis Chart */}
      <SpendingChart />
    </div>
  );
};

export default Dashboard;
