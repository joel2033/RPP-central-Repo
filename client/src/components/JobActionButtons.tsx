import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Upload, 
  AlertTriangle, 
  Send,
  Clock
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getOrderStatus, getAvailableActions } from '@shared/utils';

interface JobActionButtonsProps {
  jobCard: {
    id: number;
    uploadedAt?: string | null;
    acceptedAt?: string | null;
    readyForQCAt?: string | null;
    revisionRequestedAt?: string | null;
    deliveredAt?: string | null;
    history?: Array<{
      action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
      by: string;
      at: string;
      notes?: string;
    }>;
  };
  userRole: string;
  userId?: string;
  onActionComplete?: () => void;
}

const actionIcons = {
  upload: Upload,
  accept: CheckCircle,
  readyForQC: CheckCircle,
  revision: AlertTriangle,
  delivered: Send
};

const actionColors = {
  upload: "bg-blue-600 hover:bg-blue-700",
  accept: "bg-green-600 hover:bg-green-700", 
  readyForQC: "bg-yellow-600 hover:bg-yellow-700",
  revision: "bg-red-600 hover:bg-red-700",
  delivered: "bg-emerald-600 hover:bg-emerald-700"
};

export const JobActionButtons: React.FC<JobActionButtonsProps> = ({
  jobCard,
  userRole,
  userId,
  onActionComplete
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const actionMutation = useMutation({
    mutationFn: async ({ action, notes }: { action: string; notes?: string }) => {
      const response = await fetch(`/api/job-cards/${jobCard.id}/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to perform action");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({ title: "Success", description: "Action completed successfully" });
      setDialogOpen(false);
      setNotes("");
      setSelectedAction(null);
      onActionComplete?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to perform action", 
        variant: "destructive" 
      });
    },
  });

  const availableActions = getAvailableActions(jobCard, userRole, userId);

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    // Actions that might need notes open dialog
    if (action === "revision") {
      setDialogOpen(true);
    } else {
      actionMutation.mutate({ action });
    }
  };

  const handleDialogSubmit = () => {
    if (selectedAction) {
      actionMutation.mutate({ action: selectedAction, notes: notes || undefined });
    }
  };

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {availableActions.map(({ action, label, variant }) => {
          const Icon = actionIcons[action] || Clock;
          const colorClass = actionColors[action] || "bg-gray-600 hover:bg-gray-700";
          
          return (
            <Button
              key={action}
              onClick={() => handleActionClick(action)}
              disabled={actionMutation.isPending}
              className={`text-sm ${colorClass}`}
              size="sm"
            >
              <Icon className="h-4 w-4 mr-1" />
              {label}
            </Button>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === "revision" ? "Request Revision" : "Add Notes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">
                {selectedAction === "revision" ? "Revision Notes (Optional)" : "Notes (Optional)"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  selectedAction === "revision" 
                    ? "Describe what needs to be revised..."
                    : "Add any additional notes..."
                }
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDialogSubmit}
                disabled={actionMutation.isPending}
              >
                {actionMutation.isPending ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};