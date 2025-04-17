import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createBudget, updateBudget, formatCurrency } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowRight, 
  CalendarClock, 
  CreditCard, 
  Wallet, 
  CheckCircle2,
  Info,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Form schema with improved validation
const budgetFormSchema = z.object({
  category: z.string().min(1, "You must select a category"),
  limit: z.string()
    .min(1, "Budget limit cannot be empty")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      {
        message: "Budget limit must be a positive number",
      }
    )
    .refine(
      (val) => Number(val) >= 500,
      {
        message: "Budget should be at least ₹500",
      }
    ),
  month: z.string().min(1, "Month and year are required"),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  budgetId?: number | null;
  onComplete: () => void;
}

const BudgetForm = ({ budgetId, onComplete }: BudgetFormProps) => {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(!!budgetId);
  const [sliderValue, setSliderValue] = useState<number>(5000);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch budget data if in edit mode
  const { data: budgets = [] } = useQuery<any[]>({
    queryKey: ['/api/budgets'],
    enabled: isEditMode,
  });

  // Fetch spending data for recommendations
  const { data: categorySpending = [] } = useQuery<any[]>({
    queryKey: ['/api/stats/category-spending'],
  });

  // Find the specific budget to edit
  const budgetToEdit = budgets?.find((budget: any) => budget.id === budgetId);

  // Set up form with default values
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "",
      limit: "5000",
      month: new Date().toISOString().slice(0, 7),
    },
  });

  // Update form when editing an existing budget
  useEffect(() => {
    if (budgetToEdit) {
      const limit = String(budgetToEdit.limit);
      form.reset({
        category: budgetToEdit.category,
        limit: limit,
        month: budgetToEdit.month,
      });
      setSliderValue(Number(limit));
    }
  }, [budgetToEdit, form]);

  // Update slider when input changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'limit' && value.limit) {
        const numValue = Number(value.limit);
        if (!isNaN(numValue) && numValue > 0) {
          setSliderValue(numValue);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Handler for slider change
  const handleSliderChange = (value: number[]) => {
    const newValue = Math.round(value[0]); // Ensure it's rounded to a whole number
    setSliderValue(newValue);
    form.setValue('limit', String(newValue), { shouldValidate: true });
  };

  // Get recommendation for budget amount
  const getRecommendedBudget = (category: string): number | null => {
    if (!categorySpending || !category) return null;
    
    const spending = categorySpending.find((item: any) => item.category === category);
    if (!spending) return null;
    
    // Recommend 20% more than current spending as budget
    return Math.ceil(spending.amount * 1.2 / 100) * 100; // Round up to nearest 100
  };

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      return createBudget(
        data.category,
        parseFloat(data.limit),
        data.month
      );
    },
    onSuccess: async () => {
      toast({
        title: "Budget created successfully",
        description: "Your budget has been created and is now active.",
      });
      
      // Force data refetch with stronger cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/budgets'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stats'], refetchType: 'all' });
      
      // Force a direct refetch
      await queryClient.refetchQueries({ queryKey: ['/api/budgets'], type: 'all' });
      
      // Wait a moment to ensure state updates are processed
      setTimeout(() => onComplete(), 300);
    },
    onError: (error) => {
      console.error("Error creating budget:", error);
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
    onSuccess: async () => {
      toast({
        title: "Budget updated successfully",
        description: "Your budget has been updated with the new amount.",
      });
      
      // Force data refetch with stronger cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/budgets'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stats/budget-status'], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stats'], refetchType: 'all' });
      
      // Force a direct refetch
      await queryClient.refetchQueries({ queryKey: ['/api/budgets'], type: 'all' });
      
      // Wait a moment to ensure state updates are processed
      setTimeout(() => onComplete(), 300);
    },
    onError: (error) => {
      console.error("Error updating budget:", error);
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
    
    // Show current month and next 6 months
    for (let i = 0; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = getMonthOptions();

  // Check if budget already exists for category/month combination
  const checkExistingBudget = (category: string, month: string): boolean => {
    if (!budgets || !category || !month) return false;
    
    // Skip checking the current budget being edited
    return budgets.some((budget: any) => 
      budget.category === category && 
      budget.month === month && 
      budget.id !== budgetId
    );
  };

  // Apply recommended budget
  const applyRecommendation = () => {
    const category = form.getValues('category');
    if (!category) {
      toast({
        title: "Category required",
        description: "Please select a category first to get a recommendation.",
        variant: "destructive",
      });
      return;
    }

    const recommendedBudget = getRecommendedBudget(category);
    if (recommendedBudget) {
      form.setValue('limit', String(recommendedBudget), { shouldValidate: true });
      setSliderValue(recommendedBudget);
    } else {
      toast({
        title: "No recommendation available",
        description: "We don't have enough spending data for this category yet.",
      });
    }
  };

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          {isEditMode 
            ? <><CreditCard className="h-5 w-5 text-blue-500" /> Edit Budget</>
            : <><Wallet className="h-5 w-5 text-blue-500" /> Create New Budget</>
          }
        </h2>
        <p className="text-gray-500 mt-1">
          {isEditMode 
            ? "Update your budget amount to adjust for your spending patterns."
            : "Set up a monthly budget for a specific spending category to track your expenses."
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-800">Step 1</Badge>
                          Select Category
                        </span>
                      </FormLabel>
                      <FormDescription>
                        Choose the spending category you want to budget for.
                      </FormDescription>
                      <Select
                        disabled={isEditMode}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Check if we have a recommendation
                          const recommendedBudget = getRecommendedBudget(value);
                          if (recommendedBudget && !isEditMode) {
                            // Only show toast for new budgets
                            toast({
                              title: "Budget Recommendation Available",
                              description: `Based on your spending, we recommend a budget of ${formatCurrency(recommendedBudget)} for ${value}.`,
                            });
                          }
                        }}
                        value={field.value}
                        onOpenChange={() => setFocusedField('category')}
                      >
                        <FormControl>
                          <SelectTrigger className={`text-base h-12 ${focusedField === 'category' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category: any) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.name}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{category.name}</span>
                                {checkExistingBudget(category.name, form.getValues('month')) && (
                                  <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-200" variant="outline">
                                    Exists
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className={`transition-all duration-300 ${form.watch('category') ? 'opacity-100' : 'opacity-70 pointer-events-none'}`}>
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-base">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-800">Step 2</Badge>
                            Select Month
                          </span>
                        </FormLabel>
                        <FormDescription>
                          Choose the month for which you're creating this budget.
                        </FormDescription>
                        <Select
                          disabled={isEditMode}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Check if this budget already exists for this month
                            const existingBudget = checkExistingBudget(form.getValues('category'), value);
                            if (existingBudget) {
                              toast({
                                title: "Budget already exists",
                                description: `You already have a budget for ${form.getValues('category')} in ${formatMonth(value)}.`,
                                variant: "destructive",
                              });
                            }
                          }}
                          value={field.value}
                          onOpenChange={() => setFocusedField('month')}
                        >
                          <FormControl>
                            <SelectTrigger className={`text-base h-12 ${focusedField === 'month' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}>
                              <div className="flex items-center">
                                <CalendarClock className="mr-2 h-4 w-4 opacity-70" />
                                <SelectValue placeholder="Select month" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {monthOptions.map((option) => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{option.label}</span>
                                  {option.value === new Date().toISOString().slice(0, 7) && (
                                    <Badge className="ml-2 bg-green-100 text-green-800 border-green-200" variant="outline">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className={`transition-all duration-300 ${form.watch('category') && form.watch('month') ? 'opacity-100' : 'opacity-70 pointer-events-none'}`}>
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-base">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-800">Step 3</Badge>
                              Set Budget Amount
                            </span>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-1"
                                    type="button"
                                    onClick={applyRecommendation}
                                    disabled={!form.getValues('category')}
                                  >
                                    <Info className="h-3 w-3" />
                                    Recommend
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Get a recommended amount based on your spending history</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </FormLabel>
                        <FormDescription>
                          Drag the slider or enter an amount to set your monthly budget limit.
                        </FormDescription>
                        <div className="space-y-4">
                          <FormControl>
                            <div className="flex items-center">
                              <div className="relative flex-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="100"
                                  placeholder="5000"
                                  className={`pl-9 h-12 text-lg font-medium ${focusedField === 'limit' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                                  {...field}
                                  onFocus={() => setFocusedField('limit')}
                                  onBlur={() => setFocusedField(null)}
                                />
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</div>
                              </div>
                            </div>
                          </FormControl>
                          
                          <div className="pt-2">
                            <Slider
                              value={[sliderValue]}
                              min={500}
                              max={50000}
                              step={100}
                              onValueChange={handleSliderChange}
                              className="py-4"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>₹500</span>
                              <span>₹25,000</span>
                              <span>₹50,000</span>
                            </div>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 mt-6 border-t">
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
                  className="min-w-[120px]"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isEditMode ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  
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
        
        <div className="lg:col-span-1">
          <Card className="bg-blue-50 border-blue-100 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-800">Budget Preview</CardTitle>
              <CardDescription className="text-blue-600">
                Here's a summary of your budget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-blue-800 font-medium">Category</p>
                <p className="text-xl">
                  {form.watch('category') 
                    ? form.watch('category') 
                    : <span className="text-gray-400 italic">Select a category</span>}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-blue-800 font-medium">Month</p>
                <p className="text-xl">
                  {form.watch('month') 
                    ? formatMonth(form.watch('month'))
                    : <span className="text-gray-400 italic">Select a month</span>}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-blue-800 font-medium">Budget Amount</p>
                <p className="text-2xl font-bold text-blue-900">
                  {form.watch('limit') && !isNaN(Number(form.watch('limit')))
                    ? formatCurrency(Number(form.watch('limit')))
                    : <span className="text-gray-400 italic">Set an amount</span>}
                </p>
              </div>
              
              {/* Budget status indicator */}
              <motion.div 
                className="bg-white rounded-lg p-3 my-4 border border-blue-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-sm text-blue-800 font-medium mb-2">Daily budget</div>
                <div className="text-2xl font-bold text-blue-900">
                  {form.watch('limit') && !isNaN(Number(form.watch('limit'))) && form.watch('month')
                    ? (() => {
                        const [year, month] = form.watch('month').split('-');
                        const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
                        const dailyBudget = Number(form.watch('limit')) / daysInMonth;
                        return formatCurrency(dailyBudget);
                      })()
                    : <span className="text-gray-400 italic">-</span>}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  per day to stay within your monthly budget
                </p>
              </motion.div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-blue-700">
                Track your spending against this budget with our detailed analytics.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BudgetForm;
