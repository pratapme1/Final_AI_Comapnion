import { apiRequest } from "./queryClient";

/**
 * Formats a number as currency (Indian Rupee format)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Gets the appropriate color for a budget status
 * @param percentage - The percentage of budget used
 * @returns Color class names
 */
export function getBudgetStatusColor(percentage: number): { bg: string; text: string; border: string } {
  if (percentage >= 100) {
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  } else if (percentage >= 75) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
  } else {
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  }
}

/**
 * Deletes a budget
 * @param id - Budget ID to delete
 * @returns Delete operation result
 */
export async function deleteBudget(id: number) {
  const response = await apiRequest("DELETE", `/api/budgets/${id}`);
  return await response.json();
}

/**
 * Creates a new budget
 * @param budgetData - Budget data to create
 * @returns Created budget
 */
export async function createBudget(budgetData: any) {
  const response = await apiRequest("POST", "/api/budgets", budgetData);
  return await response.json();
}

/**
 * Updates an existing budget
 * @param id - Budget ID to update
 * @param limit - New budget limit
 * @returns Updated budget
 */
export async function updateBudget(id: number, limit: number) {
  const response = await apiRequest("PUT", `/api/budgets/${id}`, { limit });
  return await response.json();
}

/**
 * Marks an insight as read in the database
 * @param id The ID of the insight
 * @returns Promise with the updated insight
 */
export async function markInsightAsRead(id: number) {
  const response = await apiRequest("PUT", `/api/insights/${id}/read`);
  return await response.json();
}

/**
 * Loads advanced spending patterns analysis
 * @returns Promise with patterns data
 */
export async function loadSpendingPatterns() {
  const response = await apiRequest("GET", "/api/insights/spending-patterns");
  return await response.json();
}

/**
 * Loads recurring expenses detection
 * @returns Promise with recurring expenses data
 */
export async function loadRecurringExpenses() {
  const response = await apiRequest("GET", "/api/insights/recurring-expenses");
  return await response.json();
}

/**
 * Generates advanced AI insights on demand
 * @returns Promise with the generation result
 */
export async function generateAdvancedInsights() {
  const response = await apiRequest("POST", "/api/insights/generate");
  return await response.json();
}

/**
 * Get information about the insight type
 * @param type - The insight type
 * @returns Object with icon, title, and colors
 */
export function getInsightTypeInfo(type: string) {
  switch (type) {
    case 'saving':
      return {
        icon: 'trending-up',
        title: 'Savings Opportunity',
        color: 'green'
      };
    case 'budget-alert':
      return {
        icon: 'alert-triangle',
        title: 'Budget Alert',
        color: 'red'
      };
    case 'recurring':
      return {
        icon: 'clock',
        title: 'Recurring Expense',
        color: 'yellow'
      };
    case 'digest':
      return {
        icon: 'file-text',
        title: 'Weekly Digest',
        color: 'blue'
      };
    case 'pattern':
      return {
        icon: 'trending-up',
        title: 'Spending Pattern',
        color: 'indigo'
      };
    default:
      return {
        icon: 'info',
        title: 'Financial Insight',
        color: 'gray'
      };
  }
}

/**
 * Upload a receipt file to the server for processing
 * @param file The file to upload
 * @returns The processed receipt data
 */
export async function uploadReceiptFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/receipts/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload receipt: ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Create a new receipt in the database
 * @param receiptData The receipt data to create
 * @returns The created receipt
 */
export async function createReceipt(receiptData: any) {
  const response = await apiRequest("POST", "/api/receipts", receiptData);
  return await response.json();
}