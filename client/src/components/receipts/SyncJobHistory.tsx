import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Mail } from "lucide-react";
import { format, formatDistance } from "date-fns";

interface EmailProvider {
  id: number;
  providerType: string;
  email: string;
}

interface SyncJob {
  id: number;
  providerId: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  emailsProcessed: number | null;
  emailsFound: number | null;
  receiptsFound: number | null;
  shouldCancel?: boolean;
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  requestedLimit?: number | null;
}

interface SyncJobHistoryProps {
  syncJobs: SyncJob[];
  isLoading: boolean;
  providers: EmailProvider[];
}

const SyncJobHistory = ({ syncJobs, isLoading, providers }: SyncJobHistoryProps) => {
  // Function to find provider email by ID
  const getProviderEmail = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? provider.email : "Unknown account";
  };

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!Array.isArray(syncJobs) || syncJobs.length === 0) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No sync history yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Sync your email accounts to import receipts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {syncJobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map((job) => (
        <Card key={job.id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-500" />
                <span className="font-medium">{getProviderEmail(job.providerId)}</span>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">
                    Started: {format(new Date(job.startedAt), "MMM d, yyyy h:mm a")}
                  </span>
                  {job.completedAt && (
                    <span>
                      Duration: {formatDistance(new Date(job.completedAt), new Date(job.startedAt))}
                    </span>
                  )}
                </div>
              </div>
              
              {job.status === "completed" && (
                <div className="mt-1 text-sm text-green-600">
                  Found {job.resultsCount} receipt{job.resultsCount !== 1 ? "s" : ""}
                </div>
              )}
              
              {job.status === "failed" && job.error && (
                <div className="mt-1 text-sm text-red-600">
                  Error: {job.error}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end">
              {getStatusBadge(job.status)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SyncJobHistory;