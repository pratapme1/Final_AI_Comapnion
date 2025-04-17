import { apiRequest } from "./queryClient";

// Interface for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Budget related functions
export async function createBudget(category: string, limit: number, month: string) {
  return apiRequest("POST", "/api/budgets", { category, limit, month });
}

export async function updateBudget(budgetId: number, limit: number) {
  return apiRequest("PUT", `/api/budgets/${budgetId}`, { limit });
}

export async function deleteBudget(budgetId: number) {
  return apiRequest("DELETE", `/api/budgets/${budgetId}`, undefined);
}

// Receipt related functions
export async function uploadReceiptFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest("POST", "/api/receipts/upload", formData, true);
}

export async function createReceipt(merchantName: string, date: Date, total: number, items: any[]) {
  return apiRequest("POST", "/api/receipts", { 
    merchantName, 
    date: date.toISOString(), 
    total, 
    items 
  });
}

// Insight related functions
export async function markInsightAsRead(insightId: number) {
  return apiRequest("PUT", `/api/insights/${insightId}/read`, undefined);
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// Helper function to determine budget status color
export function getBudgetStatusColor(percentage: number): string {
  if (percentage >= 100) {
    return "bg-danger"; // Red
  } else if (percentage >= 80) {
    return "bg-warning"; // Orange/Yellow
  } else {
    return "bg-primary"; // Blue
  }
}

// Helper function to get insight type color and icon
export function getInsightTypeInfo(type: string): { color: string, bgColor: string, borderColor: string, icon: string } {
  switch (type) {
    case 'saving':
      return {
        color: 'text-green-800',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-100',
        icon: 'TrendingUp'
      };
    case 'budget-alert':
      return {
        color: 'text-red-800',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        icon: 'AlertTriangle'
      };
    case 'recurring':
      return {
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-100',
        icon: 'Clock'
      };
    case 'digest':
      return {
        color: 'text-blue-800',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100',
        icon: 'FileText'
      };
    default:
      return {
        color: 'text-gray-800',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-100',
        icon: 'Info'
      };
  }
}

// Function to process a receipt image using the backend API
export async function processReceiptImage(base64Image: string): Promise<{
  merchantName: string;
  date: Date;
  total: number;
  items: Array<{ name: string; price: number }>;
}> {
  try {
    const response = await apiRequest("POST", "/api/process-receipt-image", { image: base64Image });
    
    // Convert string date to Date object
    if (response.date && typeof response.date === 'string') {
      response.date = new Date(response.date);
    }
    
    return response;
  } catch (error) {
    console.error("Error processing receipt image:", error);
    throw new Error("Failed to process receipt image. Please try again or enter details manually.");
  }
}
