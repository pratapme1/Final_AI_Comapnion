import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createReceipt, uploadReceiptFile } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  PlusCircle, 
  X, 
  Upload, 
  Save, 
  FileStack, 
  FileImage, 
  FilePlus, 
  Loader2, 
  CheckCircle2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useReceiptData } from "@/hooks/use-receipt-data";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue="ai-upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-upload" className="flex items-center gap-2">
            <FileImage className="w-4 h-4" />
            Automatic AI Upload
          </TabsTrigger>
          <TabsTrigger value="manual-upload" className="flex items-center gap-2">
            <FilePlus className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>
        
        {/* AI Upload Tab Content */}
        <TabsContent value="ai-upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5 text-primary" />
                AI-Powered Receipt Processor
              </CardTitle>
              <CardDescription>
                Upload receipt images or PDFs for automatic data extraction with AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <p className="text-sm text-gray-600">Drop files here or click to browse</p>
                    <Input
                      id="receipt-upload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      disabled={isUploading || mutation.isPending}
                      className="w-full max-w-xs"
                      multiple // Allow multiple file selection
                    />
                    <p className="text-xs text-gray-500 mt-2">Supports PDF, PNG, JPG (max 10MB per file)</p>
                  </div>
                </div>
                
                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Processing {pendingUploads.length} receipt(s)...</span>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                    <Progress value={uploadedFiles.length / pendingUploads.length * 100} className="h-2" />
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {pendingUploads.map((file, index) => {
                        const isProcessed = uploadedFiles.includes(file.name);
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                            {isProcessed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
                            )}
                            <span className="flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                            <Badge className="text-xs">
                              {isProcessed ? "Complete" : "Processing"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Processed Files List */}
                {!isUploading && processedReceipts.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Successfully processed {processedReceipts.length} receipt(s)</span>
                      </div>
                      <Button 
                        variant="outline" 
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
                        className="text-xs h-8"
                      >
                        <X className="w-3 h-3 mr-1" /> Clear All
                      </Button>
                    </div>
                    
                    <div className="border rounded-md divide-y">
                      {processedReceipts.map((receipt, index) => (
                        <div key={index} className="p-3 text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{receipt.fileName}</span>
                            <Badge>{receipt.data.items?.length || 0} items</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Merchant:</span>
                              <span className="font-medium">{receipt.data.merchantName || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Date:</span>
                              <span className="font-medium">
                                {receipt.data.date 
                                  ? new Date(receipt.data.date).toLocaleDateString() 
                                  : "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total:</span>
                              <span className="font-medium">₹{receipt.data.total || "0"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Category:</span>
                              <span className="font-medium">{receipt.data.category || "Others"}</span>
                            </div>
                          </div>
                          {index === 0 && (
                            <div className="mt-2 text-xs text-blue-600">
                              This receipt is loaded in the form below for review
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {processedReceipts.length > 1 && (
                      <div className="flex justify-end mt-4">
                        <Button
                          variant="secondary"
                          className="flex items-center"
                          disabled={batchMutation.isPending || isSubmittingBatch}
                          onClick={() => batchMutation.mutate(processedReceipts)}
                        >
                          {batchMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FileStack className="mr-2 h-4 w-4" />
                              Submit All {processedReceipts.length} Receipts
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Form for verification/editing of AI-extracted data */}
              {processedReceipts.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="mb-4">
                    <h3 className="text-md font-medium">Verify Receipt Details</h3>
                    <p className="text-sm text-gray-500">
                      The AI has extracted the following details. Please verify and make any necessary corrections.
                    </p>
                  </div>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="merchantName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Merchant Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter merchant name" {...field} />
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
                              <FormLabel>Total Amount</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Enter total amount"
                                  {...field}
                                />
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
                              <FormLabel>Receipt Category</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Groceries">Groceries</SelectItem>
                                  <SelectItem value="Utilities">Utilities</SelectItem>
                                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                                  <SelectItem value="Transportation">Transportation</SelectItem>
                                  <SelectItem value="Dining">Dining</SelectItem>
                                  <SelectItem value="Shopping">Shopping</SelectItem>
                                  <SelectItem value="Travel">Travel</SelectItem>
                                  <SelectItem value="Health">Health</SelectItem>
                                  <SelectItem value="Education">Education</SelectItem>
                                  <SelectItem value="Others">Others</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label>Line Items</Label>
                            <Badge variant="outline" className="text-xs">
                              {form.getValues("items").length} items
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addItemField}
                            className="flex items-center text-xs h-7"
                          >
                            <PlusCircle className="mr-1 h-3 w-3" />
                            Add Item
                          </Button>
                        </div>
                        
                        <div className="border rounded-md p-3 space-y-4 max-h-80 overflow-y-auto">
                          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                            <div className="col-span-5">Item Name</div>
                            <div className="col-span-3">Price</div>
                            <div className="col-span-3">Category</div>
                            <div className="col-span-1"></div>
                          </div>
                          
                          {form.getValues("items").map((_, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-md p-2">
                              <div className="col-span-5">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="sr-only">Item Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Item name" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="col-span-3">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="sr-only">Price</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="Price"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="col-span-3">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.category`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="sr-only">Category</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Category" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="Groceries">Groceries</SelectItem>
                                          <SelectItem value="Utilities">Utilities</SelectItem>
                                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                                          <SelectItem value="Transportation">Transportation</SelectItem>
                                          <SelectItem value="Dining">Dining</SelectItem>
                                          <SelectItem value="Shopping">Shopping</SelectItem>
                                          <SelectItem value="Travel">Travel</SelectItem>
                                          <SelectItem value="Health">Health</SelectItem>
                                          <SelectItem value="Education">Education</SelectItem>
                                          <SelectItem value="Others">Others</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="col-span-1 pt-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItemField(index)}
                                  className="h-8 w-8 text-gray-500"
                                  disabled={form.getValues("items").length <= 1}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end mt-6">
                        <Button
                          type="submit"
                          className="flex items-center"
                          disabled={mutation.isPending}
                        >
                          {mutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Receipt
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Manual Entry Tab Content */}
        <TabsContent value="manual-upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-primary" />
                Manual Receipt Entry
              </CardTitle>
              <CardDescription>
                Manually enter receipt details without uploading files
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                            <Input placeholder="Enter merchant name" {...field} />
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
                          <FormLabel>Total Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter total amount"
                              {...field}
                            />
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
                          <FormLabel>Receipt Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Groceries">Groceries</SelectItem>
                              <SelectItem value="Utilities">Utilities</SelectItem>
                              <SelectItem value="Entertainment">Entertainment</SelectItem>
                              <SelectItem value="Transportation">Transportation</SelectItem>
                              <SelectItem value="Dining">Dining</SelectItem>
                              <SelectItem value="Shopping">Shopping</SelectItem>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Health">Health</SelectItem>
                              <SelectItem value="Education">Education</SelectItem>
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
                      <div className="flex items-center gap-2">
                        <Label>Line Items</Label>
                        <Badge variant="outline" className="text-xs">
                          {form.getValues("items").length} items
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItemField}
                        className="flex items-center text-xs h-7"
                      >
                        <PlusCircle className="mr-1 h-3 w-3" />
                        Add Item
                      </Button>
                    </div>
                    
                    <div className="border rounded-md p-3 space-y-4 max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                        <div className="col-span-5">Item Name</div>
                        <div className="col-span-3">Price</div>
                        <div className="col-span-3">Category</div>
                        <div className="col-span-1"></div>
                      </div>
                      
                      {form.getValues("items").map((_, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-md p-2">
                          <div className="col-span-5">
                            <FormField
                              control={form.control}
                              name={`items.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="sr-only">Item Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Item name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="sr-only">Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Price"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.category`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="sr-only">Category</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Groceries">Groceries</SelectItem>
                                      <SelectItem value="Utilities">Utilities</SelectItem>
                                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                                      <SelectItem value="Transportation">Transportation</SelectItem>
                                      <SelectItem value="Dining">Dining</SelectItem>
                                      <SelectItem value="Shopping">Shopping</SelectItem>
                                      <SelectItem value="Travel">Travel</SelectItem>
                                      <SelectItem value="Health">Health</SelectItem>
                                      <SelectItem value="Education">Education</SelectItem>
                                      <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-1 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItemField(index)}
                              className="h-8 w-8 text-gray-500"
                              disabled={form.getValues("items").length <= 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      className="flex items-center"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Receipt
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReceiptUpload;