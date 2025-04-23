import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "success" | "destructive" | "outline" | "secondary" = "outline";
  
  switch (status) {
    case "completed":
      variant = "success";
      break;
    case "failed":
      variant = "destructive";
      break;
    case "processing":
      variant = "default";
      break;
    case "queued":
      variant = "secondary";
      break;
  }
  
  return (
    <Badge variant={variant as any}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Format date utility
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

export default function SyncJobHistory() {
  // Fetch sync job history
  const { data: syncJobs = [], isLoading, error } = useQuery({
    queryKey: ["/api/email/sync/history"],
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading sync history</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Something went wrong. Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Type assertion for syncJobs
  const syncJobsList = Array.isArray(syncJobs) ? syncJobs : [];
  
  if (syncJobsList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Sync History</CardTitle>
          <CardDescription>
            You haven't synced any email accounts yet. Connect an email account and sync to see history here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Results</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {syncJobsList.map((job: any) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{job.providerEmail}</TableCell>
              <TableCell>{formatDate(job.createdAt)}</TableCell>
              <TableCell>
                <StatusBadge status={job.status} />
              </TableCell>
              <TableCell>
                {job.status === "completed" 
                  ? `${job.receiptsFound || 0} receipts found` 
                  : job.status === "failed" 
                    ? job.errorMessage || "Error occurred"
                    : "In progress..."}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <p className="text-xs text-muted-foreground italic">
        Note: Sync history is retained for 30 days.
      </p>
    </div>
  );
}