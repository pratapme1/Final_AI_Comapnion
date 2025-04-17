import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createReceipt, uploadReceiptFile } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { PlusCircle, X, Upload } from "lucide-react";

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
    onSuccess: () => {
      toast({
        title: "Receipt saved successfully",
        description: "Your receipt has been processed and insights are being generated.",
      });

      form.reset({
        merchantName: "",
        date: new Date().toISOString().split("T")[0],
        total: "",
        items: [{ name: "", price: "" }]
      });

      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
    onError: () => {
      toast({
        title: "Error saving receipt",
        description: "There was a problem saving your receipt. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ReceiptFormValues) => {
    mutation.mutate(data);
  };

  const addItemField = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { name: "", price: "" }]);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, PNG, or JPG file.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const response = await uploadReceiptFile(file);
      setUploadedData(response);

      // Pre-fill form with extracted data
      if (response) {
        // Ensure items have string values for the form
        const formattedItems = response.items?.map((item: {name: string, price: number}) => ({
          name: item.name || '',
          price: (item.price !== undefined) ? item.price.toString() : ''
        })) || [{ name: "", price: "" }];
        
        form.reset({
          merchantName: response.merchantName || '',
          date: response.date?.split('T')[0] || new Date().toISOString().split("T")[0],
          total: response.total?.toString() || '',
          items: formattedItems
        });
      }

      toast({
        title: "Receipt uploaded successfully",
        description: "The receipt data has been extracted and pre-filled.",
      });
    } catch (error) {
      toast({
        title: "Error processing receipt",
        description: "There was a problem processing your receipt. Please enter details manually.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
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
            Upload Receipt File (PDF, PNG, or JPG)
          </Label>
          <div className="flex gap-4 items-center">
            <Input
              id="receipt-upload"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={isUploading || mutation.isPending}
              className="flex-1"
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
          {isUploading && (
            <p className="text-sm text-gray-500 mt-2">Processing receipt...</p>
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
                  <div className="md:col-span-8">
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

                  <div className="md:col-span-3">
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

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Processing..." : "Submit Receipt"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ReceiptUpload;