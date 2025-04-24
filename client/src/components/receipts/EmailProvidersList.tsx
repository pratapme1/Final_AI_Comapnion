import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Trash2, Mail, AlertCircle, Settings, CalendarIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

interface EmailProvider {
  id: number;
  providerType: string;
  email: string;
  lastSyncAt: string | null;
}

interface SyncOptions {
  providerId: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

interface EmailProvidersListProps {
  providers: EmailProvider[];
  isLoading: boolean;
  onSync: (options: SyncOptions) => void;
  onDisconnect: (providerId: number) => void;
  isSyncing: boolean;
}

const formatLastSyncTime = (lastSyncAt: string | null): string => {
  if (!lastSyncAt) return "Never synced";
  
  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return syncDate.toLocaleDateString();
  }
};

const EmailProvidersList = ({ 
  providers, 
  isLoading, 
  onSync, 
  onDisconnect,
  isSyncing
}: EmailProvidersListProps) => {
  const [providerId, setProviderId] = useState<number | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<EmailProvider | null>(null);
  
  type SyncFormValues = {
    startDate: Date | undefined;
    endDate: Date | undefined;
    limit: number | undefined;
  };
  
  const syncForm = useForm<SyncFormValues>({
    defaultValues: {
      startDate: undefined,
      endDate: undefined,
      limit: 500,
    },
  });
  
  const handleSyncWithOptions = (data: SyncFormValues) => {
    if (!currentProvider) return;
    
    const options: SyncOptions = {
      providerId: currentProvider.id,
    };
    
    // Convert Date objects to ISO strings if present
    if (data.startDate) {
      options.startDate = data.startDate.toISOString();
    }
    
    if (data.endDate) {
      options.endDate = data.endDate.toISOString();
    }
    
    if (data.limit) {
      options.limit = data.limit;
    }
    
    onSync(options);
    setSyncDialogOpen(false);
  };
  
  const openSyncDialog = (provider: EmailProvider) => {
    setCurrentProvider(provider);
    setSyncDialogOpen(true);
    
    // Reset form with default values
    syncForm.reset({
      startDate: undefined,
      endDate: undefined,
      limit: 500,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!Array.isArray(providers) || providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Advanced Sync Options Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Advanced Sync Options</DialogTitle>
            <DialogDescription>
              Set a date range or limit the number of emails to scan for receipts.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...syncForm}>
            <form onSubmit={syncForm.handleSubmit(handleSyncWithOptions)} className="space-y-4 py-2">
              {/* Start Date Field */}
              <FormField
                control={syncForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a start date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Only search emails from this date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* End Date Field */}
              <FormField
                control={syncForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick an end date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Only search emails until this date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Email Limit Field */}
              <FormField
                control={syncForm.control}
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Limit</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="500" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of emails to process (use 0 for no limit)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={isSyncing}>
                  {isSyncing ? 'Processing...' : 'Start Sync'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {providers.map((provider) => (
        <Card key={provider.id} className="p-4 relative overflow-hidden">
          {/* Provider indicator strip */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${provider.providerType === 'gmail' ? 'bg-red-500' : provider.providerType === 'outlook' ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            {/* Provider info */}
            <div className="mb-3 sm:mb-0">
              <div className="flex items-center">
                <Mail className={`mr-2 h-5 w-5 ${provider.providerType === 'gmail' ? 'text-red-500' : provider.providerType === 'outlook' ? 'text-blue-500' : 'text-gray-500'}`} />
                <div>
                  <p className="font-medium text-gray-900">{provider.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="capitalize text-xs">
                      {provider.providerType}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Last sync: {formatLastSyncTime(provider.lastSyncAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync({ providerId: provider.id })}
                disabled={isSyncing}
                className="text-xs h-8"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Sync Now
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSyncDialog(provider)}
                disabled={isSyncing}
                className="text-xs h-8"
              >
                <Settings className="mr-1 h-3 w-3" />
                Advanced
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setProviderId(provider.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Email Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to disconnect {provider.email}? This will remove access to scan this account for receipts.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDisconnect(provider.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default EmailProvidersList;