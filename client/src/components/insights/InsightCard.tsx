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
              {insight.type === 'digest' ? (
                <div className="digest-content">
                  {/* Process and clean the content before splitting into paragraphs */}
                  {(() => {
                    // Function to clean and normalize the content
                    const cleanContent = (rawContent: string) => {
                      return rawContent
                        .replace(/\\n/g, '\n')      // Replace literal \n with line breaks
                        .replace(/\\"/g, '"')       // Replace \" with "
                        .replace(/\\'/g, "'")       // Replace \' with '
                        .replace(/\\t/g, '    ')    // Replace \t with spaces
                        .replace(/\\r/g, '')        // Remove \r characters
                        // Replace Unicode escapes with actual characters
                        .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
                          return String.fromCharCode(parseInt(code, 16));
                        });
                    };
                    
                    // Clean the content first
                    const cleanedContent = cleanContent(insight.content);
                    
                    // Now split by real line breaks and process
                    return cleanedContent.split('\n').map((paragraph, index) => {
                      // Check if this is a heading (starts with ## or #)
                      if (paragraph.startsWith('## ')) {
                        return (
                          <h4 key={index} className="text-blue-700 font-medium text-sm mt-3 mb-1 border-b pb-1 border-blue-100">
                            {paragraph.replace('## ', '')}
                          </h4>
                        );
                      } else if (paragraph.startsWith('# ')) {
                        return (
                          <h3 key={index} className="text-blue-800 font-semibold text-base mt-4 mb-2">
                            {paragraph.replace('# ', '')}
                          </h3>
                        );
                      } else if (paragraph.startsWith('- ')) {
                        // This is a list item
                        return (
                          <div key={index} className="flex items-baseline mb-1">
                            <div className="rounded-full bg-blue-200 h-1.5 w-1.5 mt-1.5 mr-2 flex-shrink-0"></div>
                            <p>{paragraph.replace('- ', '')}</p>
                          </div>
                        );
                      } else if (paragraph.includes(':')) {
                        // This might be a key-value pair like "Total Spend: $500"
                        const [key, value] = paragraph.split(':');
                        if (key && value) {
                          return (
                            <div key={index} className="flex justify-between items-center my-1 border-b border-blue-50 pb-1">
                              <span className="font-medium">{key.trim()}:</span>
                              <span className="text-right">{value.trim()}</span>
                            </div>
                          );
                        }
                      }
                      
                      // Regular paragraph with some space between
                      return paragraph.trim() ? (
                        <p key={index} className="mb-2">{paragraph}</p>
                      ) : (
                        <div key={index} className="h-2"></div> // Empty line spacer
                      );
                    });
                  })()}
                </div>
              ) : (
                <p>{insight.content}</p>
              )}
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div>
                {insight.relatedItemId && (
                  <Link href={`/receipts/${insight.relatedItemId}`}>
                    <span className={`text-xs font-medium ${styles.text} hover:underline flex items-center cursor-pointer`}>
                      View transaction
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </span>
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
