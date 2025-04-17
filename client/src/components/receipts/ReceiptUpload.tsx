import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReceipt, uploadReceiptFile } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { PlusCircle, X, Upload, Save, FileStack } from "lucide-react";
import { useReceiptData } from "@/hooks/use-receipt-data";

const receiptSchema = z.object({
  merchantName: z.string().min(1, "Merchant name is required"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid date is required"
  }),
  total: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Total must be a positive number"
  }),
  category: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1, "Item name is required"),
      price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Price must be a positive number"
      }),
      category: z.string().optional()
    })
  ).min(1, "At least one item is required")
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

const ReceiptUpload = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [pendingUploads, setPendingUploads] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [processedReceipts, setProcessedReceipts] = useState<any[]>([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      merchantName: "",
      date: new Date().toISOString().split("T")[0],
      total: "",
      category: "Others", // Default category
      items: [{ name: "", price: "", category: "Others" }]
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: ReceiptFormValues) => {
      const formattedData = {
        merchantName: data.merchantName,
        date: new Date(data.date),
        total: parseFloat(data.total),
        category: data.category || "Others", // Include receipt category
        items: data.items.map(item => ({
          name: item.name,
          price: parseFloat(item.price),
          category: item.category || data.category || "Others" // Use item category or receipt category or default
        }))
      };

      return createReceipt(
        formattedData.merchantName,
        formattedData.date,
        formattedData.total,
        formattedData.items,
        formattedData.category
      );
    },
    onSuccess: async () => {
      toast({
        title: "Receipt saved successfully",
        description: "Your receipt has been processed and insights are being generated.",
      });

      form.reset({
        merchantName: "",
        date: new Date().toISOString().split("T")[0],
        total: "",
        category: "Others", // Default category
        items: [{ name: "", price: "", category: "Others" }]
      });

      // Use the centralized invalidation method from context for consistent refresh
      await invalidateData();
      
      // Force direct data refetch for immediate UI updates
      await queryClient.refetchQueries({ queryKey: ['/api/receipts'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats/budget-status'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats/category-spending'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats/monthly-spending'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/insights'], type: 'all' });
    },
    onError: () => {
      toast({
        title: "Error saving receipt",
        description: "There was a problem saving your receipt. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Use the receipt data context for data refresh
  const { invalidateData } = useReceiptData();
  
  const onSubmit = (data: ReceiptFormValues) => {
    mutation.mutate(data);
  };

  // Add a batch submission function for multiple receipts
  const batchMutation = useMutation({
    mutationFn: async (receipts: any[]) => {
      setIsSubmittingBatch(true);
      const results = [];
      
      try {
        for (const receipt of receipts) {
          // Skip null or invalid entries
          if (!receipt || !receipt.data) continue;
          
          const data = receipt.data;
          
          // Format the data for submission
          const formattedData = {
            merchantName: data.merchantName || '',
            date: new Date(data.date || new Date()),
            total: parseFloat(data.total) || 0,
            category: data.category || "Others",
            items: (data.items || []).map((item: any) => ({
              name: item.name || '',
              price: parseFloat(item.price) || 0,
              category: item.category || data.category || "Others"
            }))
          };
          
          // Submit each receipt
          const result = await createReceipt(
            formattedData.merchantName,
            formattedData.date,
            formattedData.total,
            formattedData.items,
            formattedData.category
          );
          
          results.push(result);
        }
        
        return results;
      } finally {
        setIsSubmittingBatch(false);
      }
    },
    onSuccess: async () => {
      toast({
        title: "Batch upload successful",
        description: `Successfully saved ${processedReceipts.length} receipts to your account.`,
      });
      
      // Reset the form and clear processed receipts
      form.reset({
        merchantName: "",
        date: new Date().toISOString().split("T")[0],
        total: "",
        category: "Others",
        items: [{ name: "", price: "", category: "Others" }]
      });
      
      // Clear processed receipts and uploaded files
      setProcessedReceipts([]);
      setUploadedFiles([]);
      
      // Use the centralized invalidation method from context
      await invalidateData();
      
      // Force direct data refetch for immediate UI updates
      await queryClient.refetchQueries({ queryKey: ['/api/receipts'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats/budget-status'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats/category-spending'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/stats/monthly-spending'], type: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/insights'], type: 'all' });
    },
    onError: () => {
      toast({
        title: "Batch upload failed",
        description: "There was a problem saving some or all of your receipts. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addItemField = () => {
    const items = form.getValues("items");
    const receiptCategory = form.getValues("category") || "Others";
    form.setValue("items", [...items, { name: "", price: "", category: receiptCategory }]);
  };

  const removeItemField = (index: number) => {
    const items = form.getValues("items");
    if (items.length > 1) {
      form.setValue(
        "items",
        items.filter((_, i) => i !== index)
      );
    }
  };

  const processFile = async (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `${file.name} skipped - Please upload only PDF, PNG, or JPG files.`,
        variant: "destructive"
      });
      return null;
    }

    try {
      const response = await uploadReceiptFile(file);
      setUploadedFiles(prev => [...prev, file.name]);
      
      // Store the processed receipt data for batch submission
      if (response) {
        setProcessedReceipts(prev => [...prev, {
          fileName: file.name,
          data: response
        }]);
      }
      
      return response;
    } catch (error) {
      toast({
        title: "Error processing receipt",
        description: `Failed to process ${file.name}. Please try again or enter details manually.`,
        variant: "destructive"
      });
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setPendingUploads(Array.from(files));

    try {
      // Process first file to populate the form
      if (files.length > 0) {
        const firstFile = files[0];
        const response = await processFile(firstFile);
        setUploadedData(response);

        // Pre-fill form with extracted data from the first file
        if (response) {
          // Get the GPT-detected category if available or use default
          const detectedCategory = response.category || "Others";
          
          // Ensure items have string values for the form and include categories
          const formattedItems = response.items?.map((item: {name: string, price: number, category?: string}) => ({
            name: item.name || '',
            price: (item.price !== undefined) ? item.price.toString() : '',
            category: item.category || detectedCategory // Use item's category or receipt category
          })) || [{ name: "", price: "", category: detectedCategory }];
          
          form.reset({
            merchantName: response.merchantName || '',
            date: response.date?.split('T')[0] || new Date().toISOString().split("T")[0],
            total: response.total?.toString() || '',
            category: detectedCategory,
            items: formattedItems
          });
        }

        // Process additional files in the background if there are multiple
        if (files.length > 1) {
          toast({
            title: "Processing multiple receipts",
            description: `Processing ${files.length} receipts. First receipt data has been loaded in the form.`,
          });
          
          // Process remaining files in background (could store them for batch upload later)
          for (let i = 1; i < files.length; i++) {
            await processFile(files[i]);
          }
        }
      }

      toast({
        title: "Receipt upload complete",
        description: `Successfully processed ${files.length} receipt(s).`,
      });
    } catch (error) {
      console.error("Error processing receipts:", error);
      toast({
        title: "Error processing receipts",
        description: "There was a problem processing your receipts. Some files may not have been processed.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setPendingUploads([]);
      e.target.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Upload Receipt</h2>
          <p className="text-sm text-gray-500">
            Upload a receipt to get AI-powered insights on your spending
          </p>
        </div>

        <div className="mb-6">
          <Label htmlFor="receipt-upload" className="block mb-2">
            Upload Receipt Files (PDF, PNG, or JPG)
          </Label>
          <div className="flex gap-4 items-center">
            <Input
              id="receipt-upload"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={isUploading || mutation.isPending}
              className="flex-1"
              multiple // Allow multiple file selection
            />
            <Button
              variant="outline"
              size="icon"
              disabled={isUploading}
              className="flex-shrink-0"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>

          {/* Show processing status */}
          {isUploading && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-gray-700">Processing {pendingUploads.length} receipt(s)...</p>
              <ul className="mt-1 space-y-1">
                {pendingUploads.map((file, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-gray-600">{file.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show successfully processed files */}
          {!isUploading && uploadedFiles.length > 0 && (
            <div className="mt-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-700">Successfully processed:</p>
                <div className="flex items-center gap-3">
                  {uploadedFiles.length > 1 && (
                    <span className="text-sm text-blue-600">
                      {uploadedFiles.length} receipts ready for submission
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setUploadedFiles([]);
                      setProcessedReceipts([]);
                      form.reset({
                        merchantName: "",
                        date: new Date().toISOString().split("T")[0],
                        total: "",
                        category: "Others",
                        items: [{ name: "", price: "", category: "Others" }]
                      });
                    }}
                    className="h-7 px-2"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <ul className="mt-1 space-y-1">
                {uploadedFiles.map((fileName, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">{fileName}</span>
                  </li>
                ))}
              </ul>
              
              {uploadedFiles.length > 1 && (
                <p className="mt-2 text-xs text-gray-500">
                  The first receipt is loaded in the form below. You can edit it before submitting or use the "Submit All" button to process all receipts at once.
                </p>
              )}
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="merchantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Big Basket" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        // First update the receipt category
                        field.onChange(value);
                        
                        // Then update all item categories that haven't been explicitly modified
                        const items = form.getValues("items");
                        const defaultCategory = form.getValues("category") || "Others";
                        
                        // Update items that haven't been explicitly changed from default/receipt category
                        const updatedItems = items.map(item => {
                          // If item category matches the previous default, update it to new default
                          if (item.category === defaultCategory || item.category === "Others") {
                            return { ...item, category: value };
                          }
                          return item;
                        });
                        
                        form.setValue("items", updatedItems);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Groceries">Groceries</SelectItem>
                        <SelectItem value="Dining">Dining</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Personal Care">Personal Care</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Receipt Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemField}
                  className="flex items-center"
                >
                  <PlusCircle className="mr-1 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {form.watch("items").map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                            Item Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Milk 1L" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                            Price (₹)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-5">
                    <FormField
                      control={form.control}
                      name={`items.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                            Category
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Groceries">Groceries</SelectItem>
                              <SelectItem value="Dining">Dining</SelectItem>
                              <SelectItem value="Utilities">Utilities</SelectItem>
                              <SelectItem value="Transportation">Transportation</SelectItem>
                              <SelectItem value="Entertainment">Entertainment</SelectItem>
                              <SelectItem value="Shopping">Shopping</SelectItem>
                              <SelectItem value="Health">Health</SelectItem>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Personal Care">Personal Care</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemField(index)}
                      disabled={form.watch("items").length <= 1}
                      className="h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Button to submit batch receipts */}
            {uploadedFiles.length > 1 && (
              <Button
                type="button"
                className="w-full mb-3"
                variant="secondary"
                disabled={batchMutation.isPending || isSubmittingBatch || processedReceipts.length === 0}
                onClick={() => batchMutation.mutate(processedReceipts)}
              >
                <FileStack className="mr-2 h-4 w-4" />
                {batchMutation.isPending ? "Processing..." : `Submit All ${processedReceipts.length} Receipts`}
              </Button>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || batchMutation.isPending}
            >
              {mutation.isPending ? "Processing..." : "Submit Current Receipt"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ReceiptUpload;