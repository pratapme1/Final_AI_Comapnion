import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getInsightTypeInfo, markInsightAsRead } from "@/lib/openai";
import { queryClient } from "@/lib/queryClient";
import { 
  AlertTriangle, 
  ArrowRightIcon,
  BrainIcon, 
  ChevronRightIcon, 
  Clock, 
  FileText, 
  LightbulbIcon, 
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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

  const getIconAndColors = (type: string) => {
    switch (type) {
      case 'saving':
        return {
          icon: <TrendingUp className="h-4 w-4 text-white" />,
          bgClass: 'bg-green-500',
          cardBgClass: 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500',
          textClass: 'text-green-700'
        };
      case 'budget-alert':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-white" />,
          bgClass: 'bg-red-500',
          cardBgClass: 'bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-l-red-500',
          textClass: 'text-red-700'
        };
      case 'recurring':
        return {
          icon: <Clock className="h-4 w-4 text-white" />,
          bgClass: 'bg-amber-500',
          cardBgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-500',
          textClass: 'text-amber-700'
        };
      case 'digest':
        return {
          icon: <FileText className="h-4 w-4 text-white" />,
          bgClass: 'bg-blue-500',
          cardBgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500',
          textClass: 'text-blue-700'
        };
      default:
        return {
          icon: <LightbulbIcon className="h-4 w-4 text-white" />,
          bgClass: 'bg-purple-500',
          cardBgClass: 'bg-gradient-to-r from-purple-50 to-violet-50 border-l-4 border-l-purple-500',
          textClass: 'text-purple-700'
        };
    }
  };

  // Get type name
  const getInsightTitle = (type: string) => {
    switch (type) {
      case 'saving': return 'Savings Opportunity';
      case 'budget-alert': return 'Budget Alert';
      case 'recurring': return 'Recurring Expense Alert';
      case 'digest': return 'Weekly Smart Digest';
      default: return 'Financial Insight';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <BrainIcon className="h-5 w-5 mr-2 text-primary" />
            Smart Insights
          </CardTitle>
          <CardDescription>AI-powered financial recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-start">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="ml-3 w-full">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentInsights = insights?.slice(0, 3) || [];
  const hasInsights = recentInsights.length > 0;

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium flex items-center">
              <BrainIcon className="h-5 w-5 mr-2 text-primary" />
              Smart Insights
            </CardTitle>
            <CardDescription>AI-powered financial recommendations</CardDescription>
          </div>
          <Link href="/insights">
            <Button variant="ghost" size="sm" className="text-primary">
              View all <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {hasInsights ? (
          <div className="space-y-3">
            {recentInsights.map((insight) => {
              const { icon, bgClass, cardBgClass, textClass } = getIconAndColors(insight.type);
              const insightTitle = getInsightTitle(insight.type);
              
              return (
                <div 
                  key={insight.id} 
                  className={`${cardBgClass} p-3 rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer`}
                  onClick={() => !insight.read && handleMarkAsRead(insight.id)}
                  style={{ opacity: insight.read ? 0.8 : 1 }}
                >
                  <div className="flex items-start">
                    <div className={`${bgClass} p-2 rounded-lg shadow-sm flex-shrink-0 mr-3`}>
                      {icon}
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium ${textClass} flex items-center`}>
                        {insightTitle}
                        {!insight.read && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        )}
                      </h3>
                      <p className="mt-1 text-sm text-gray-700 line-clamp-2">
                        {insight.type === 'digest' 
                          ? insight.content
                              .replace(/\\n/g, ' ')
                              .replace(/# |## /g, '')
                              .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                          : insight.content}
                      </p>
                      {insight.relatedItemId && (
                        <Link href={`/receipts/${insight.relatedItemId}`}>
                          <Button variant="ghost" size="sm" className={`mt-1 p-0 h-6 ${textClass}`}>
                            <span className="text-xs">View details</span>
                            <ArrowRightIcon className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <Link href="/insights">
              <Button variant="outline" size="sm" className="w-full mt-2 text-sm">
                <LightbulbIcon className="h-3.5 w-3.5 mr-2 text-amber-500" />
                View All Insights
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gray-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <LightbulbIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-1">No insights yet</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
              AI-powered insights will appear here as you track your expenses.
            </p>
            <Link href="/insights">
              <Button variant="outline" size="sm">
                Explore Insights
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightsList;
