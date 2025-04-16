import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/openai";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const TransactionList = () => {
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['/api/receipts'],
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="px-4 py-4 sm:px-6">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-5 w-5 mr-3 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recentReceipts = receipts?.slice(0, 5) || [];

  // Function to get an icon based on merchant type
  const getMerchantIcon = (merchantName: string) => {
    const name = merchantName.toLowerCase();

    if (name.includes('market') || name.includes('grocery') || name.includes('basket')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    } else if (name.includes('cafe') || name.includes('restaurant') || name.includes('food')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a4 4 0 00-4-4H8.8a4 4 0 00-3.6 2.3L4 8h16l-1.2-3.7A4 4 0 0016.2 2H16a4 4 0 00-4 4v2zm0 13a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    } else if (name.includes('netflix') || name.includes('prime') || name.includes('disney')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (name.includes('electricity') || name.includes('water') || name.includes('bill')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
  };

  // Function to get category color
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

  // Check if an item is recurring
  const hasRecurringItems = (items: any[]) => {
    return items.some(item => item.recurring);
  };

  // Get insight for an item
  const getItemInsight = (items: any[]) => {
    const itemWithInsight = items.find(item => item.gptInsight);
    return itemWithInsight ? itemWithInsight.gptInsight : null;
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {recentReceipts.length > 0 ? (
            recentReceipts.map((receipt, index) => {
              const primaryCategory = receipt.items?.length > 0 
                ? receipt.items.reduce((acc: any, curr: any) => {
                    const cat = curr.category || 'Others';
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                  }, {})
                : { 'Others': 1 };
              
              const dominantCategory = Object.entries(primaryCategory)
                .sort((a: any, b: any) => b[1] - a[1])[0][0];

              const insight = getItemInsight(receipt.items || []);
              const isRecurring = hasRecurringItems(receipt.items || []);
              
              return (
                <div key={index} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getMerchantIcon(receipt.merchantName)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{receipt.merchantName}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(receipt.date), "MMM d, yyyy, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(receipt.total)}</p>
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(dominantCategory)}`}>
                        {dominantCategory}
                      </span>
                    </div>
                  </div>
                  
                  {/* Show insight if available */}
                  {insight && (
                    <div className="mt-2 text-sm text-gray-500 bg-blue-50 p-2 rounded-md border-l-4 border-blue-400">
                      <p className="font-medium text-blue-700">AI Insight:</p>
                      <p>{insight}</p>
                    </div>
                  )}
                  
                  {/* Show recurring notice if applicable */}
                  {isRecurring && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-warning mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-warning font-medium">Recurring monthly expense</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-gray-500">
              <p>No transactions yet. Upload a receipt to get started.</p>
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6">
          <a href="/receipts" className="text-sm font-medium text-primary hover:text-blue-700">
            View all transactions <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
