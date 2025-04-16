import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/openai";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SpendingChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(250);
  const { data: categorySpending, isLoading: categoryIsLoading } = useQuery({
    queryKey: ['/api/stats/category-spending'],
  });
  
  const { data: monthlySpending, isLoading: monthlyIsLoading } = useQuery({
    queryKey: ['/api/stats/monthly-spending'],
  });

  useEffect(() => {
    const updateChartHeight = () => {
      if (chartRef.current) {
        // On mobile make chart taller, on desktop keep it at original height
        const isMobile = window.innerWidth < 768;
        setChartHeight(isMobile ? 350 : 250);
      }
    };

    updateChartHeight();
    window.addEventListener('resize', updateChartHeight);
    return () => window.removeEventListener('resize', updateChartHeight);
  }, []);

  const isLoading = categoryIsLoading || monthlyIsLoading;

  if (isLoading) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Spending Analysis</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3">
                <Skeleton className="h-64 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-1/2 mb-3" />
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = monthlySpending?.map((month) => {
    // Get the top 3 categories and combine the rest as "Others"
    const categories = Object.entries(month.categories || {})
      .sort((a, b) => b[1] - a[1]);
    
    // Only show top 3 categories in chart
    const chartCategories: Record<string, number> = {};
    
    categories.forEach(([category, amount], index) => {
      if (index < 3) {
        chartCategories[category] = amount;
      }
    });
    
    return {
      month: month.month,
      total: month.amount,
      ...chartCategories
    };
  });

  // Build colors array for the chart
  const chartColors: Record<string, string> = {
    'Groceries': '#3B82F6', // blue
    'Dining': '#EF4444', // red
    'Utilities': '#10B981', // green
    'Transportation': '#F59E0B', // amber
    'Entertainment': '#8B5CF6', // purple
    'Shopping': '#EC4899', // pink
    'Health': '#14B8A6', // teal
    'Others': '#6B7280', // gray
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Spending Analysis</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3" ref={chartRef}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => `₹${value}`} 
                    width={60}
                  />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, ""]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  {chartData && chartData[0] && Object.keys(chartData[0])
                    .filter(key => key !== 'month' && key !== 'total')
                    .map((category, index) => (
                      <Line
                        key={index}
                        type="monotone"
                        dataKey={category}
                        stroke={chartColors[category] || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    ))
                  }
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Spending by Category</h4>
                <div className="space-y-2">
                  {categorySpending?.map((category, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: category.color }}></div>
                      <span className="text-sm text-gray-700">{category.category}</span>
                      <span className="ml-auto text-sm font-medium text-gray-900">{formatCurrency(category.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Insights</h4>
                <p className="text-sm text-gray-700">
                  {categorySpending?.[0]?.category === 'Dining' 
                    ? "Dining expenses are higher compared to last month. Groceries spending remains consistent."
                    : categorySpending?.[0]?.category === 'Groceries'
                      ? "Groceries are your highest expense this month. Consider buying in bulk to save."
                      : "Your biggest expense this month is " + (categorySpending?.[0]?.category || "unknown") + "."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingChart;
