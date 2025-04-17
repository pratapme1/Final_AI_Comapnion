import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/openai";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Tag, Clock, AlertCircle } from "lucide-react";
import { Receipt, ReceiptItem } from "@shared/schema";

interface ReceiptsListProps {
  searchTerm: string;
  sortBy: string;
  categoryFilter: string;
}

const ReceiptsList = ({ searchTerm, sortBy, categoryFilter }: ReceiptsListProps) => {
  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ['/api/receipts'],
  });

  // Filter and sort receipts based on props
  const getFilteredReceipts = () => {
    if (!receipts) return [];

    // Filter by search term
    let filtered = receipts.filter((receipt) => {
      const matchesMerchant = receipt.merchantName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesItem = receipt.items.some((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchesMerchant || matchesItem;
    });

    // Filter by category if not "all"
    if (categoryFilter !== "all") {
      filtered = filtered.filter((receipt) =>
        receipt.items.some((item) => item.category === categoryFilter)
      );
    }

    // Sort receipts
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc":
          return Number(b.total) - Number(a.total);
        case "amount-asc":
          return Number(a.total) - Number(b.total);
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  };

  const filteredReceipts = getFilteredReceipts();

  // Check if a receipt has insights
  const hasInsights = (receipt: Receipt) => {
    return receipt.items.some((item) => item.gptInsight);
  };

  // Check if a receipt has recurring items
  const hasRecurringItems = (receipt: Receipt) => {
    return receipt.items.some((item) => item.recurring);
  };

  // Get primary category for a receipt
  const getPrimaryCategory = (items: ReceiptItem[]) => {
    const categories: Record<string, number> = {};

    items.forEach((item) => {
      const category = item.category || "Others";
      categories[category] = (categories[category] || 0) + 1;
    });

    // Make sure we handle empty items array
    if (Object.entries(categories).length === 0) {
      return "Others";
    }

    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0][0];
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full mr-3" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="mt-3 md:mt-0">
                  <Skeleton className="h-6 w-20 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredReceipts.length > 0 ? (
        filteredReceipts.map((receipt) => {
          const primaryCategory = getPrimaryCategory(receipt.items || []);

          return (
            <Link key={receipt.id} to={`/receipts/${receipt.id}`}>
              <div className="block cursor-pointer">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start">
                        <div className="bg-gray-100 p-2 rounded-full mr-3 flex-shrink-0 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{receipt.merchantName}</h3>
                          <p className="text-sm text-gray-500">
                            {format(new Date(receipt.date), "PPP")} • {receipt.items.length} items
                          </p>

                          <div className="flex flex-wrap mt-2 gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(primaryCategory)}`}>
                              {primaryCategory}
                            </span>

                            {hasInsights(receipt) && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Insights
                              </span>
                            )}

                            {hasRecurringItems(receipt) && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Recurring
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 md:mt-0 md:text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(Number(receipt.total))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {receipt.items.slice(0, 2).map((item, i) => (
                            <span key={i} className="inline-block mr-1">
                              {item.name}{i < Math.min(2, receipt.items.length) - 1 ? "," : ""} 
                            </span>
                          ))}
                          {receipt.items.length > 2 && <span>+{receipt.items.length - 2} more</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Link>
          );
        })
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No receipts found</h3>
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== "all"
                ? "Try adjusting your search criteria"
                : "Upload your first receipt to get started"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReceiptsList;