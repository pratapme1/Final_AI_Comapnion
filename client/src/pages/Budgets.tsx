import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BudgetForm from "@/components/budgets/BudgetForm";
import BudgetList from "@/components/budgets/BudgetList";
import { PlusIcon } from "lucide-react";

const Budgets = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const toggleForm = () => {
    setShowForm(!showForm);
    setSelectedBudgetId(null);
  };

  const handleEditBudget = (budgetId: number) => {
    setSelectedBudgetId(budgetId);
    setShowForm(true);
  };

  // Generate month options for the last 6 months and next 6 months
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = -5; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = getMonthOptions();

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Budget Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up and manage your category-based spending limits
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={toggleForm} className="inline-flex items-center">
            {showForm ? "Cancel" : (
              <>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Budget
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Budget Form (conditionally rendered) */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <BudgetForm 
              budgetId={selectedBudgetId} 
              onComplete={() => {
                setShowForm(false);
                setSelectedBudgetId(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Month Selector Tabs */}
      <Tabs 
        defaultValue={currentMonth} 
        onValueChange={setCurrentMonth}
        className="mb-6"
      >
        <TabsList className="grid grid-cols-3 md:grid-cols-6 lg:w-1/2">
          {monthOptions.slice(3, 9).map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label.split(' ')[0]}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {monthOptions.map((option) => (
          <TabsContent key={option.value} value={option.value}>
            <Card>
              <CardContent className="pt-6">
                <BudgetList 
                  month={option.value} 
                  onEditBudget={handleEditBudget}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Budget Status and Insights */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-medium mb-4">Budget Insights</h2>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              <span className="font-medium">💡 Budget tip:</span> Based on your spending patterns, consider allocating more budget to your Dining category, which you regularly exceed by 15-20%.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Budgets;
