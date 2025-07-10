// Utility functions for action-based status system

export interface JobCardWithTimestamps {
  deliveredAt?: string | null;
  status?: string;
  editorId?: string;
  assignedAt?: string | null;
}

/**
 * Get the current status of an order based on action timestamps and status field
 * This supports both new lifecycle and legacy status systems
 */
export function getOrderStatus(order: JobCardWithTimestamps): string {
  // Use explicit status field if available
  if (order.status) {
    return order.status;
  }
  
  // Fallback to timestamp-based calculation
  if (order.deliveredAt) return "delivered";
  if (order.assignedAt && order.editorId) return "in_progress";
  return "pending";
}

/**
 * Get the display label for a status
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending";
    case "unassigned": return "Pending";
    case "in_progress": return "In Progress";
    case "editing": return "In Progress";
    case "ready_for_qc": return "Ready for QC";
    case "ready_for_qa": return "Ready for QC";
    case "in_revision": return "In Revision";
    case "delivered": return "Delivered";
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Get the color for a status badge
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-gray-100 text-gray-800";
    case "in_progress": return "bg-blue-100 text-blue-800";
    case "ready_for_qc": return "bg-yellow-100 text-yellow-800";
    case "in_revision": return "bg-red-100 text-red-800";
    case "delivered": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

/**
 * Create a new history entry for tracking actions
 */
export function createHistoryEntry(
  action: "upload" | "accept" | "readyForQC" | "revision" | "delivered",
  userId: string,
  notes?: string
): {
  action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
  by: string;
  at: string;
  notes?: string;
} {
  return {
    action,
    by: userId,
    at: new Date().toISOString(),
    notes
  };
}

/**
 * Get the next available actions for a user based on current status and role
 * Support both new timestamp-based and legacy status-based systems
 */
export function getAvailableActions(
  order: JobCardWithTimestamps & { status?: string },
  userRole: string,
  userId?: string
): Array<{
  action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
  label: string;
  variant: "default" | "destructive" | "outline" | "secondary";
}> {
  // Use existing status field
  const status = order.status || 'pending';
  
  const actions: Array<{
    action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
    label: string;
    variant: "default" | "destructive" | "outline" | "secondary";
  }> = [];

  // Editor actions
  if (userRole === "editor") {
    if (status === "pending" || status === "unassigned") {
      actions.push({ action: "accept", label: "Accept Job", variant: "default" });
    }
    if (status === "in_progress" || status === "editing") {
      actions.push({ action: "readyForQC", label: "Mark Ready for QC", variant: "default" });
    }
  }

  // Admin/Photographer actions (removed delivery and revision buttons - these will be in job cards)

  return actions;
}