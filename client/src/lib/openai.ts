import { apiRequest } from "./queryClient";

/**
 * Formats a number as currency (INR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Function to send a request to generate insights based on a receipt
 * @param receiptId - The ID of the receipt to analyze
 */
export async function generateReceiptInsights(receiptId: number): Promise<void> {
  console.log(`Generating insights for receipt ${receiptId}`);
  await apiRequest('POST', '/api/insights/generate-receipt-insights', { receiptId });
}

/**
 * Function to generate weekly financial digest
 */
export async function generateWeeklyDigest(): Promise<void> {
  console.log('Generating weekly financial digest');
  await apiRequest('POST', '/api/insights/generate-weekly-digest');
}

/**
 * Function to mark an insight as read
 * @param insightId - The ID of the insight to mark as read
 */
export async function markInsightAsRead(insightId: number): Promise<void> {
  await apiRequest('PUT', `/api/insights/${insightId}/read`);
}

/**
 * Helper function to get the CSS color class for budget status bars based on percentage
 * @param percentage - The percentage of budget used
 * @returns CSS class for the status color
 */
export function getBudgetStatusColor(percentage: number): string {
  if (percentage < 50) {
    return 'bg-green-500';
  } else if (percentage < 75) {
    return 'bg-yellow-500';
  } else if (percentage < 90) {
    return 'bg-orange-500';
  } else {
    return 'bg-red-500';
  }
}

/**
 * Helper function for deleting a budget
 * @param budgetId - The ID of the budget to delete
 */
export async function deleteBudget(budgetId: number): Promise<void> {
  await apiRequest('DELETE', `/api/budgets/${budgetId}`);
}

/**
 * Returns styling and icon information for different insight types
 * @param type - The type of insight
 * @returns Object with icon, color, and background color information
 */
export function getInsightTypeInfo(type: string): { 
  icon: string; 
  color: string; 
  bgColor: string;
  label: string;
} {
  switch (type) {
    case 'saving':
      return {
        icon: 'piggy-bank',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Saving Opportunity'
      };
    case 'recurring':
      return {
        icon: 'repeat',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Recurring Expense'
      };
    case 'budget-alert':
      return {
        icon: 'alert-triangle',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Budget Alert'
      };
    case 'digest':
      return {
        icon: 'file-text',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Weekly Digest'
      };
    case 'receipt-analysis':
      return {
        icon: 'receipt',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        label: 'Receipt Insight'
      };
    default:
      return {
        icon: 'lightbulb',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'AI Insight'
      };
  }
}

/**
 * Function to create a new budget
 * @param data - Budget data including category, limit, and month
 */
export async function createBudget(data: { 
  category: string; 
  limit: string; 
  month: string; 
}): Promise<any> {
  return await apiRequest('POST', '/api/budgets', data);
}

/**
 * Function to update an existing budget
 * @param id - ID of the budget to update
 * @param limit - New budget limit value
 */
export async function updateBudget(id: number, limit: string): Promise<any> {
  return await apiRequest('PUT', `/api/budgets/${id}`, { limit });
}

/**
 * Function to upload a receipt file for processing
 * @param file - The receipt file to upload
 */
export async function uploadReceiptFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/receipts/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload receipt');
  }
  
  return await response.json();
}

/**
 * Function to create a new receipt
 * @param merchantName - Name of the merchant
 * @param date - Date of the receipt
 * @param total - Total amount of the receipt
 * @param items - List of items in the receipt
 * @param category - Optional category for the receipt
 */
export async function createReceipt(
  merchantName: string, 
  date: Date, 
  total: number, 
  items: any[], 
  category?: string
): Promise<any> {
  const response = await apiRequest('POST', '/api/receipts', {
    merchantName,
    date,
    total,
    items,
    category
  });
  return response;
}