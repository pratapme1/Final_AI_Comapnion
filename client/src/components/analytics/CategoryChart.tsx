import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/openai";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts";

interface CategoryChartProps {
  timeframe: string;
}

const CategoryChart = ({ timeframe }: CategoryChartProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  
  const { data: categorySpending, isLoading } = useQuery({
    queryKey: ['/api/stats/category-spending'],
  });

  // Prepare data for chart when it loads
  useEffect(() => {
    if (categorySpending) {
      // Sort by amount descending
      const sorted = [...categorySpending].sort((a, b) => b.amount - a.amount);
      
      // If there are more than 5 categories, combine the smallest ones into "Others"
      if (sorted.length > 5) {
        const topCategories = sorted.slice(0, 4);
        const others = sorted.slice(4).reduce(
          (acc, curr) => ({
            category: "Others",
            amount: acc.amount + curr.amount,
            color: "#6B7280", // Gray color for "Others"
          }),
          { category: "Others", amount: 0, color: "#6B7280" }
        );
        
        setChartData([...topCategories, others]);
      } else {
        setChartData(sorted);
      }
    }
  }, [categorySpending]);

  if (isLoading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <Skeleton className="h-[240px] w-[240px] rounded-full" />
      </div>
    );
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
  
    return null;
  };

  return (
    <div className="h-[350px] w-full">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="amount"
              nameKey="category"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical" 
              verticalAlign="middle" 
              align="right"
              formatter={(value, entry: any, index) => (
                <span className="text-sm">
                  {value} - {formatCurrency(chartData[index]?.amount || 0)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-gray-500">
          No spending data available
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
