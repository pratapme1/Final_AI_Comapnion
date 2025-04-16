import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SpendingTrendProps {
  timeframe: string;
}

const SpendingTrend = ({ timeframe }: SpendingTrendProps) => {
  const [months, setMonths] = useState(6);
  
  // Update months based on timeframe
  useEffect(() => {
    switch (timeframe) {
      case "3months":
        setMonths(3);
        break;
      case "6months":
        setMonths(6);
        break;
      case "1year":
        setMonths(12);
        break;
      default:
        setMonths(6);
    }
  }, [timeframe]);
  
  const { data: monthlySpending, isLoading } = useQuery({
    queryKey: ['/api/stats/monthly-spending', { months }],
  });
  
  if (isLoading) {
    return (
      <div className="h-[300px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  
  // Get top 3 categories to show
  const getTopCategories = () => {
    if (!monthlySpending || monthlySpending.length === 0) return [];
    
    // Combine all category data from all months
    const combinedCategories: Record<string, number> = {};
    
    monthlySpending.forEach((month: any) => {
      Object.entries(month.categories || {}).forEach(([category, amount]) => {
        combinedCategories[category] = (combinedCategories[category] || 0) + (amount as number);
      });
    });
    
    // Sort and get top 3
    return Object.entries(combinedCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  };
  
  const topCategories = getTopCategories();
  
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
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center text-sm">
              <div
                className="w-3 h-3 mr-2 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: ₹{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="h-[300px] w-full">
      {monthlySpending && monthlySpending.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={monthlySpending}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis
              tickFormatter={(value) => `₹${value / 1000}k`}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Total spending line */}
            <Line
              type="monotone"
              dataKey="amount"
              name="Total"
              stroke="#000000"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            
            {/* Category lines */}
            {topCategories.map((category, index) => (
              <Line
                key={category}
                type="monotone"
                name={category}
                dataKey={`categories.${category}`}
                stroke={chartColors[category] || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                strokeWidth={1.5}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-gray-500">
          No spending trend data available
        </div>
      )}
    </div>
  );
};

export default SpendingTrend;
