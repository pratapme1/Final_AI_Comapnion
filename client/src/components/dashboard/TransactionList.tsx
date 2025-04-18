import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/openai";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from "wouter";
import { 
  ArrowRightIcon, 
  ChevronRightIcon, 
  ClockIcon, 
  HomeIcon, 
  ReceiptIcon, 
  ShoppingBasketIcon, 
  ShoppingCartIcon,
  UtensilsIcon,
  ZapIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TransactionList = () => {
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['/api/receipts'],
  });

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <ReceiptIcon className="h-5 w-5 mr-2 text-primary" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Your latest receipts and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 mr-3 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentReceipts = receipts?.slice(0, 3) || [];
  const hasReceipts = recentReceipts.length > 0;

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const categoryLower = (category || '').toLowerCase();
    
    switch (categoryLower) {
      case 'groceries':
        return <ShoppingBasketIcon className="h-4 w-4 text-green-500" />;
      case 'dining':
      case 'food':
      case 'restaurant':
        return <UtensilsIcon className="h-4 w-4 text-amber-500" />;
      case 'utilities':
        return <ZapIcon className="h-4 w-4 text-blue-500" />;
      case 'shopping':
        return <ShoppingCartIcon className="h-4 w-4 text-pink-500" />;
      case 'housing':
      case 'rent':
        return <HomeIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <ReceiptIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  // Function to get dominant category from receipt items
  const getDominantCategory = (items: any[] = []) => {
    if (!items || items.length === 0) return 'Others';
    
    const categoryCount = items.reduce((acc: Record<string, number>, item: any) => {
      const category = item.category || 'Others';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(categoryCount)
      .sort((a: any, b: any) => b[1] - a[1])[0][0];
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium flex items-center">
              <ReceiptIcon className="h-5 w-5 mr-2 text-primary" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Your latest receipts and expenses</CardDescription>
          </div>
          {hasReceipts && (
            <Link href="/receipts">
              <Button variant="ghost" size="sm" className="text-primary">
                View all <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {hasReceipts ? (
          <div className="space-y-4">
            {recentReceipts.map((receipt, index) => {
              const dominantCategory = getDominantCategory(receipt.items);
              const receiptDate = new Date(receipt.date);
              const formattedDate = format(receiptDate, "MMM d, yyyy");
              const formattedTime = format(receiptDate, "h:mm a");
              
              // Determine a background color based on the category
              let bgColorClass;
              switch(dominantCategory.toLowerCase()) {
                case 'groceries': bgColorClass = 'bg-green-50'; break;
                case 'dining': bgColorClass = 'bg-amber-50'; break;
                case 'utilities': bgColorClass = 'bg-blue-50'; break;
                case 'entertainment': bgColorClass = 'bg-purple-50'; break;
                case 'transportation': bgColorClass = 'bg-indigo-50'; break;
                default: bgColorClass = 'bg-gray-50';
              }
              
              return (
                <div 
                  key={index} 
                  className={`rounded-lg ${bgColorClass} p-3 border border-gray-100 transition-all hover:shadow-md`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                        {getCategoryIcon(dominantCategory)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{receipt.merchantName}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          <span>{formattedDate} • {formattedTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(receipt.total)}</p>
                      <p className="text-xs mt-1 font-medium text-gray-600">{dominantCategory}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <Link href="/receipts/upload">
              <Button variant="outline" size="sm" className="w-full mt-2 text-sm">
                <ArrowRightIcon className="h-3.5 w-3.5 mr-2" />
                Upload New Receipt
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gray-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
              <ReceiptIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-1">No transactions yet</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
              Upload your first receipt to start tracking your expenses.
            </p>
            <Link href="/receipts/upload">
              <Button variant="outline" size="sm">
                Upload Your First Receipt
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionList;
