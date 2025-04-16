import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getInsightTypeInfo, markInsightAsRead } from "@/lib/openai";
import { queryClient } from "@/lib/queryClient";
import { AlertTriangle, Clock, FileText, Info, TrendingUp } from "lucide-react";

const InsightsList = () => {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['/api/insights'],
  });

  const handleMarkAsRead = async (insightId: number) => {
    try {
      await markInsightAsRead(insightId);
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'saving':
        return <TrendingUp className="h-6 w-6 text-green-600" />;
      case 'budget-alert':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'recurring':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'digest':
        return <FileText className="h-6 w-6 text-blue-600" />;
      default:
        return <Info className="h-6 w-6 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">AI Insights & Recommendations</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-5">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex items-start">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="ml-3 w-full">
                      <Skeleton className="h-4 w-1/3 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const recentInsights = insights?.slice(0, 5) || [];

  const getInsightTitle = (type: string) => {
    switch (type) {
      case 'saving':
        return 'Savings Opportunity';
      case 'budget-alert':
        return 'Budget Alert';
      case 'recurring':
        return 'Recurring Expense Alert';
      case 'digest':
        return 'Weekly Smart Digest';
      default:
        return 'Financial Insight';
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">AI Insights & Recommendations</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-5">
            {recentInsights.length > 0 ? (
              recentInsights.map((insight) => {
                const typeInfo = getInsightTypeInfo(insight.type);
                
                return (
                  <div 
                    key={insight.id} 
                    className={`${typeInfo.bgColor} p-4 rounded-lg border ${typeInfo.borderColor}`}
                    onClick={() => !insight.read && handleMarkAsRead(insight.id)}
                    style={{ opacity: insight.read ? 0.7 : 1 }}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {renderIcon(insight.type)}
                      </div>
                      <div className="ml-3">
                        <h3 className={`text-sm font-medium ${typeInfo.color}`}>
                          {getInsightTitle(insight.type)}
                          {!insight.read && (
                            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                          )}
                        </h3>
                        <div className={`mt-2 text-sm ${typeInfo.color}`}>
                          <p>{insight.content}</p>
                        </div>
                        {insight.relatedItemId && (
                          <div className="mt-3">
                            <a href={`/receipts/${insight.relatedItemId}`} className={`text-xs font-medium ${typeInfo.color} hover:opacity-80`}>
                              View transaction <span aria-hidden="true">&rarr;</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No insights available yet. They will appear here as you track your expenses.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsList;
