import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Receipt Context Types
type ReceiptItem = {
  name: string;
  price: number;
  category?: string;
  gptInsight?: string;
  recurring?: boolean;
};

type Receipt = {
  id: number;
  userId: number;
  merchantName: string;
  date: string;
  total: string;
  items: ReceiptItem[];
};

type Category = {
  id: number;
  name: string;
};

type ReceiptContextType = {
  receipts: Receipt[];
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  uploadReceiptMutation: any;
  saveReceiptMutation: any;
  deleteReceiptMutation: any;
  invalidateData: () => Promise<void>;
  getCategoryOptions: () => { label: string; value: string }[];
  processReceiptImage: (imageData: string) => Promise<any>;
};

export const ReceiptContext = createContext<ReceiptContextType | null>(null);

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch all receipts
  const {
    data: receipts = [],
    isLoading: receiptsLoading,
    isError: receiptsError,
  } = useQuery<Receipt[]>({
    queryKey: ['/api/receipts'],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Fetch all categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 300000, // Categories rarely change, cache for 5 minutes
  });

  // Process receipt image
  const processReceiptImage = async (imageData: string) => {
    try {
      const res = await apiRequest("POST", "/api/process-receipt-image", { image: imageData });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error processing receipt image:", error);
      toast({
        title: "Error processing receipt",
        description: "There was a problem processing your receipt image. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Upload receipt mutation (for file uploads)
  const uploadReceiptMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/receipts/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }
      
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Receipt uploaded successfully",
        description: "Your receipt has been uploaded and processed.",
      });
      await invalidateData();
    },
    onError: (error) => {
      console.error("Error uploading receipt:", error);
      toast({
        title: "Error uploading receipt",
        description: "There was a problem uploading your receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save receipt mutation (for manually entered receipts)
  const saveReceiptMutation = useMutation({
    mutationFn: async (receiptData: any) => {
      // Ensure each item has a category (default to "Others" if not provided)
      if (receiptData.items) {
        receiptData.items = receiptData.items.map((item: any) => ({
          ...item,
          category: item.category || "Others",
        }));
      }
      
      const res = await apiRequest("POST", "/api/receipts", receiptData);
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Receipt saved successfully",
        description: "Your receipt has been saved and processed.",
      });
      await invalidateData();
    },
    onError: (error) => {
      console.error("Error saving receipt:", error);
      toast({
        title: "Error saving receipt",
        description: "There was a problem saving your receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete receipt mutation
  const deleteReceiptMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/receipts/${id}`);
    },
    onSuccess: async () => {
      toast({
        title: "Receipt deleted",
        description: "The receipt has been deleted successfully.",
      });
      await invalidateData();
    },
    onError: (error) => {
      console.error("Error deleting receipt:", error);
      toast({
        title: "Error",
        description: "Failed to delete the receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to invalidate all receipt-related data
  const invalidateData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/receipts'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/stats'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/stats/category-spending'], refetchType: 'all' });
    await queryClient.invalidateQueries({ queryKey: ['/api/insights'], refetchType: 'all' });
    
    // Force direct refetch of key data
    await queryClient.refetchQueries({ queryKey: ['/api/receipts'], type: 'all' });
  };

  // Helper function to get category options formatted for dropdown components
  const getCategoryOptions = () => {
    return categories.map((category) => ({
      label: category.name,
      value: category.name,
    }));
  };

  return (
    <ReceiptContext.Provider
      value={{
        receipts,
        categories,
        isLoading: receiptsLoading || categoriesLoading,
        isError: receiptsError || categoriesError,
        uploadReceiptMutation,
        saveReceiptMutation,
        deleteReceiptMutation,
        invalidateData,
        getCategoryOptions,
        processReceiptImage,
      }}
    >
      {children}
    </ReceiptContext.Provider>
  );
}

export function useReceiptData() {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error("useReceiptData must be used within a ReceiptProvider");
  }
  return context;
}