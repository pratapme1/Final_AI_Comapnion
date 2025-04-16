import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBudget, updateBudget } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema
const budgetFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  limit: z.string().min(1, "Limit is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    {
      message: "Limit must be a positive number",
    }
  ),
  month: z.string().min(1, "Month is required"),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  budgetId?: number | null;
  onComplete: () => void;
}

const BudgetForm = ({ budgetId, onComplete }: BudgetFormProps) => {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(!!budgetId);

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Fetch budget data if in edit mode
  const { data: budgets } = useQuery({
    queryKey: ['/api/budgets'],
    enabled: isEditMode,
  });

  // Find the specific budget to edit
  const budgetToEdit = budgets?.find((budget: any) => budget.id === budgetId);

  // Set up form with default values
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "",
      limit: "",
      month: new Date().toISOString().slice(0, 7),
    },
  });

  // Update form when editing an existing budget
  useEffect(() => {
    if (budgetToEdit) {
      form.reset({
        category: budgetToEdit.category,
        limit: String(budgetToEdit.limit),
        month: budgetToEdit.month,
      });
    }
  }, [budgetToEdit, form]);

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      return createBudget(
        data.category,
        parseFloat(data.limit),
        data.month
      );
    },
    onSuccess: () => {
      toast({
        title: "Budget created successfully",
        description: "Your budget has been created and is now active.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'] });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Error creating budget",
        description: "There was a problem creating your budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update budget mutation
  const updateMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      if (!budgetId) throw new Error("Budget ID is required for updates");
      return updateBudget(budgetId, parseFloat(data.limit));
    },
    onSuccess: () => {
      toast({
        title: "Budget updated successfully",
        description: "Your budget has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'] });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Error updating budget",
        description: "There was a problem updating your budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: BudgetFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Generate month options for dropdown
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = -1; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = getMonthOptions();

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">
        {isEditMode ? "Edit Budget" : "Create New Budget"}
      </h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    disabled={isEditMode}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Limit (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="5000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select
                    disabled={isEditMode}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onComplete}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditMode
                ? "Update Budget"
                : "Create Budget"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default BudgetForm;
