import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, Mail, AlertCircle } from "lucide-react";
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

interface EmailProvider {
  id: number;
  provider: string;
  email: string;
  lastSyncAt: string | null;
}

interface EmailProvidersListProps {
  providers: EmailProvider[];
  isLoading: boolean;
  onSync: (providerId: number) => void;
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
      {providers.map((provider) => (
        <Card key={provider.id} className="p-4 relative overflow-hidden">
          {/* Provider indicator strip */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${provider.provider === 'gmail' ? 'bg-red-500' : provider.provider === 'outlook' ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            {/* Provider info */}
            <div className="mb-3 sm:mb-0">
              <div className="flex items-center">
                <Mail className={`mr-2 h-5 w-5 ${provider.provider === 'gmail' ? 'text-red-500' : provider.provider === 'outlook' ? 'text-blue-500' : 'text-gray-500'}`} />
                <div>
                  <p className="font-medium text-gray-900">{provider.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="capitalize text-xs">
                      {provider.provider}
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
                onClick={() => onSync(provider.id)}
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