import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/openai";
import { format } from "date-fns";
import { Clock, AlertCircle, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, ReceiptItem } from "@shared/schema";
import ReceiptAIInsights from "./ReceiptAIInsights";

interface ReceiptDetailProps {
  id: number;
}

const ReceiptDetail = ({ id }: ReceiptDetailProps) => {
  const { data: receipt, isLoading, error } = useQuery<Receipt>({
    queryKey: [`/api/receipts/${id}`],
    enabled: !isNaN(id), // Only fetch if we have a valid ID
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          
          <div className="mb-6">
            <Skeleton className="h-5 w-32 mb-3" />
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          
          <div className="flex justify-between font-medium text-lg">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!receipt) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Receipt not found</h3>
          <p className="text-gray-500">The receipt you're looking for doesn't exist or was deleted.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "PPP 'at' h:mm a");
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch(category?.toLowerCase()) {
      case 'groceries':
        return 'bg-green-100 text-green-800';
      case 'dining':
        return 'bg-yellow-100 text-yellow-800';
      case 'entertainment':
        return 'bg-purple-100 text-purple-800';
      case 'utilities':
        return 'bg-blue-100 text-blue-800';
      case 'transportation':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Receipt Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{receipt.merchantName}</h2>
            <p className="text-gray-500">{formatDate(receipt.date.toString())}</p>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2 md:mt-0">
            {formatCurrency(Number(receipt.total))}
          </div>
        </div>
        
        {/* Items List */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Items ({receipt.items.length})</h3>
          <div className="divide-y">
            {receipt.items.map((item, index) => (
              <div key={index} className="py-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-2">
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">{item.name}</span>
                        {item.recurring && (
                          <span className="ml-2 flex items-center text-xs text-warning font-medium">
                            <Clock className="inline-block h-3 w-3 mr-1" />
                            Recurring
                          </span>
                        )}
                      </div>
                      {item.category && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(Number(item.price))}</span>
                </div>
                
                {/* Item Insight */}
                {item.gptInsight && (
                  <div className="mt-2 text-sm text-gray-500 bg-blue-50 p-2 rounded-md border-l-4 border-blue-400">
                    <div className="flex items-start">
                      <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 mr-1 flex-shrink-0" />
                      <p>{item.gptInsight}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Receipt Summary */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>{formatCurrency(Number(receipt.total))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptDetail;
