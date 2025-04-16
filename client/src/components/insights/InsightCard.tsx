import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markInsightAsRead } from "@/lib/openai";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { AlertTriangle, Clock, FileText, Info, TrendingUp, ExternalLink, CheckCircle } from "lucide-react";

interface InsightCardProps {
  insight: any;
}

const InsightCard = ({ insight }: InsightCardProps) => {
  const [isMarking, setIsMarking] = useState(false);
  
  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (insight.read || isMarking) return;
    
    setIsMarking(true);
    try {
      await markInsightAsRead(insight.id);
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
    } finally {
      setIsMarking(false);
    }
  };
  
  const renderIcon = () => {
    switch (insight.type) {
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
  
  const getInsightStyles = () => {
    switch (insight.type) {
      case 'saving':
        return {
          bg: 'bg-green-50',
          border: 'border-green-100',
          text: 'text-green-800',
          title: 'Savings Opportunity'
        };
      case 'budget-alert':
        return {
          bg: 'bg-red-50',
          border: 'border-red-100',
          text: 'text-red-800',
          title: 'Budget Alert'
        };
      case 'recurring':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-100',
          text: 'text-yellow-800',
          title: 'Recurring Expense Alert'
        };
      case 'digest':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          text: 'text-blue-800',
          title: 'Weekly Smart Digest'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-100',
          text: 'text-gray-800',
          title: 'Financial Insight'
        };
    }
  };
  
  const styles = getInsightStyles();
  
  return (
    <Card
      className={`${styles.bg} border ${styles.border} ${insight.read ? 'opacity-75' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-1">
            {renderIcon()}
          </div>
          <div className="ml-3 flex-grow">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium ${styles.text} flex items-center`}>
                {styles.title}
                {!insight.read && (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </h3>
              <span className="text-xs text-gray-500">
                {format(new Date(insight.date), "MMM d, yyyy")}
              </span>
            </div>
            <div className={`mt-2 text-sm ${styles.text} whitespace-pre-line`}>
              <p>{insight.content}</p>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div>
                {insight.relatedItemId && (
                  <Link href={`/receipts/${insight.relatedItemId}`}>
                    <a className={`text-xs font-medium ${styles.text} hover:underline flex items-center`}>
                      View transaction
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Link>
                )}
              </div>
              {!insight.read && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleMarkAsRead}
                  disabled={isMarking}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Mark as read
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
