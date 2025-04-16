import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createReceipt } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { PlusCircle, X } from "lucide-react";

// Define the receipt schema
const receiptSchema = z.object({
  merchantName: z.string().min(1, "Merchant name is required"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Valid date is required"
  }),
  total: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Total must be a positive number"
  }),
  items: z.array(
    z.object({
      name: z.string().min(1, "Item name is required"),
      price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Price must be a positive number"
      })
    })
  ).min(1, "At least one item is required")
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

const ReceiptUpload = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Initialize the form
  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      merchantName: "",
      date: new Date().toISOString().split("T")[0],
      total: "",
      items: [{ name: "", price: "" }]
    }
  });

  // Handle form submission
  const mutation = useMutation({
    mutationFn: async (data: ReceiptFormValues) => {
      // Convert string values to appropriate types
      const formattedData = {
        merchantName: data.merchantName,
        date: new Date(data.date),
        total: parseFloat(data.total),
        items: data.items.map(item => ({
          name: item.name,
          price: parseFloat(item.price)
        }))
      };
      
      return createReceipt(
        formattedData.merchantName,
        formattedData.date,
        formattedData.total,
        formattedData.items
      );
    },
    onSuccess: () => {
      toast({
        title: "Receipt uploaded successfully",
        description: "Your receipt has been processed and insights are being generated.",
      });
      
      // Reset the form
      form.reset({
        merchantName: "",
        date: new Date().toISOString().split("T")[0],
        total: "",
        items: [{ name: "", price: "" }]
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
    onError: () => {
      toast({
        title: "Error uploading receipt",
        description: "There was a problem uploading your receipt. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ReceiptFormValues) => {
    mutation.mutate(data);
  };

  // Add a new item field
  const addItemField = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { name: "", price: "" }]);
  };

  // Remove an item field
  const removeItemField = (index: number) => {
    const items = form.getValues("items");
    if (items.length > 1) {
      form.setValue(
        "items",
        items.filter((_, i) => i !== index)
      );
    }
  };

  // Handle file upload (mock function since we're not implementing actual OCR)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Mock OCR process with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Receipt scanning not available",
        description: "Please enter receipt details manually.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error scanning receipt",
        description: "There was a problem scanning your receipt. Please enter details manually.",
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
            Scan Receipt (Optional)
          </Label>
          <Input
            id="receipt-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading || mutation.isPending}
          />
          {isUploading && (
            <p className="text-sm text-gray-500 mt-2">Scanning receipt...</p>
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
