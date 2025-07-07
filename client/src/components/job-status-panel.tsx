import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Clock, 
  Camera, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Package,
  X,
  Save,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface JobStatusPanelProps {
  jobId: number;
  currentStatus: string;
  jobStatus: string;
  onStatusUpdate?: (newStatus: string) => void;
  compact?: boolean;
}

const statusConfig = {
  unassigned: {
    label: "Unassigned",
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
    nextStates: ["in_progress"]
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800",
    icon: Camera,
    nextStates: ["editing", "ready_for_qa"]
  },
  editing: {
    label: "Editing",
    color: "bg-purple-100 text-purple-800",
    icon: Edit3,
    nextStates: ["ready_for_qa", "in_revision"]
  },
  ready_for_qa: {
    label: "Ready for Pre-Delivery Check",
    color: "bg-orange-100 text-orange-800",
    icon: CheckCircle,
    nextStates: ["delivered", "in_revision"]
  },
  in_revision: {
    label: "In Revision",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
    nextStates: ["editing", "ready_for_qa"]
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
    icon: Package,
    nextStates: ["in_revision"]
  }
};

export default function JobStatusPanel({ 
  jobId, 
  currentStatus, 
  jobStatus, 
  onStatusUpdate,
  compact = false 
}: JobStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; notes?: string }) => {
      return apiRequest(`/api/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Job status has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId.toString()] });
      onStatusUpdate?.(selectedStatus);
      setIsExpanded(false);
      setNotes("");
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update job status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (selectedStatus === currentStatus) {
      setIsExpanded(false);
      return;
    }
    
    updateStatusMutation.mutate({
      status: selectedStatus,
      notes: notes.trim() || undefined,
    });
  };

  const handleQuickUpdate = (newStatus: string) => {
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate({
      status: newStatus,
      notes: `Quick update to ${statusConfig[newStatus as keyof typeof statusConfig].label}`,
    });
  };

  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig];
  const CurrentIcon = currentConfig?.icon || Clock;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={currentConfig?.color}>
          <CurrentIcon className="h-3 w-3 mr-1" />
          {currentConfig?.label}
        </Badge>
        <div className="flex gap-1">
          {currentConfig?.nextStates.map((nextStatus) => {
            const nextConfig = statusConfig[nextStatus as keyof typeof statusConfig];
            return (
              <Button
                key={nextStatus}
                variant="outline"
                size="sm"
                onClick={() => handleQuickUpdate(nextStatus)}
                disabled={updateStatusMutation.isPending}
                className="h-7 px-2 text-xs"
              >
                {nextConfig.label}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={currentConfig?.color}>
              <CurrentIcon className="h-3 w-3 mr-1" />
              {currentConfig?.label}
            </Badge>
            <span className="text-sm text-gray-600">Status</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={updateStatusMutation.isPending}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {currentConfig?.nextStates.map((nextStatus) => {
            const nextConfig = statusConfig[nextStatus as keyof typeof statusConfig];
            const NextIcon = nextConfig.icon;
            return (
              <Button
                key={nextStatus}
                variant="outline"
                size="sm"
                onClick={() => handleQuickUpdate(nextStatus)}
                disabled={updateStatusMutation.isPending}
                className="flex items-center gap-1"
              >
                <NextIcon className="h-3 w-3" />
                {nextConfig.label}
              </Button>
            );
          })}
        </div>

        {/* Expanded Options */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <Label htmlFor="status-select" className="text-sm font-medium">
                Update Status
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-3 w-3" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="status-notes"
                placeholder="Add a note about this status update..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleStatusUpdate}
                disabled={updateStatusMutation.isPending}
                size="sm"
                className="flex-1"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Update Status
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsExpanded(false);
                  setSelectedStatus(currentStatus);
                  setNotes("");
                }}
                disabled={updateStatusMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}