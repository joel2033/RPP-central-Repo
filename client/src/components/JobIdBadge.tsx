import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Hash, AlertCircle, CheckCircle } from "lucide-react";

interface JobIdBadgeProps {
  jobCardId: number;
  jobId: string | null;
  showAssignButton?: boolean;
  variant?: "default" | "small";
}

export const JobIdBadge = memo(({ 
  jobCardId, 
  jobId, 
  showAssignButton = false,
  variant = "default"
}: JobIdBadgeProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const assignJobIdMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/job-cards/${jobCardId}/assign-job-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign Job ID");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards", jobCardId] });
      toast({
        title: "Job ID Assigned",
        description: `Job ID ${data.jobId} has been assigned successfully`,
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (jobId) {
    return (
      <Badge 
        variant="secondary" 
        className={`flex items-center gap-1 ${variant === "small" ? "text-xs px-2 py-1" : "text-sm px-3 py-1"}`}
      >
        <Hash className="h-3 w-3" />
        {jobId}
      </Badge>
    );
  }

  if (!showAssignButton) {
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 text-gray-500 ${variant === "small" ? "text-xs px-2 py-1" : "text-sm px-3 py-1"}`}
      >
        <AlertCircle className="h-3 w-3" />
        No Job ID
      </Badge>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={variant === "small" ? "sm" : "default"}
          className="flex items-center gap-1"
        >
          <Hash className="h-3 w-3" />
          Assign Job ID
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Job ID</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Ready to assign Job ID</p>
                  <p className="text-sm text-blue-700">
                    This will create a unique lifetime Job ID for this editing order
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Once assigned, the Job ID cannot be changed. 
                  This ID will be used for all content pieces in this editing order.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => assignJobIdMutation.mutate()}
                  disabled={assignJobIdMutation.isPending}
                  className="flex-1"
                >
                  {assignJobIdMutation.isPending ? "Assigning..." : "Assign Job ID"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={assignJobIdMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
});

JobIdBadge.displayName = "JobIdBadge";