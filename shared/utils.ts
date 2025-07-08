// Utility functions for action-based status system

export interface JobCardWithTimestamps {
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
}

/**
 * Get the current status of an order based on action timestamps
 * This replaces manual status dropdown with automatic status calculation
 */
export function getOrderStatus(order: JobCardWithTimestamps): string {
  if (order.deliveredAt) return "delivered";
  if (order.revisionRequestedAt) return "in_revision";
  if (order.readyForQCAt) return "ready_for_qc";
  if (order.acceptedAt) return "in_progress";
  if (order.uploadedAt) return "pending";
  return "pending";
}

/**
 * Get the display label for a status
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending";
    case "in_progress": return "In Progress";
    case "ready_for_qc": return "Ready for QC";
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
 */
export function getAvailableActions(
  order: JobCardWithTimestamps,
  userRole: string,
  userId?: string
): Array<{
  action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
  label: string;
  variant: "default" | "destructive" | "outline" | "secondary";
}> {
  const status = getOrderStatus(order);
  const actions: Array<{
    action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
    label: string;
    variant: "default" | "destructive" | "outline" | "secondary";
  }> = [];

  // Editor actions
  if (userRole === "editor") {
    if (status === "pending" && !order.acceptedAt) {
      actions.push({ action: "accept", label: "Accept Job", variant: "default" });
    }
    if (status === "in_progress" && order.acceptedAt && !order.readyForQCAt) {
      actions.push({ action: "readyForQC", label: "Mark Ready for QC", variant: "default" });
    }
  }

  // Admin/Photographer actions
  if (userRole === "admin" || userRole === "licensee" || userRole === "photographer") {
    if (status === "ready_for_qc") {
      actions.push({ action: "revision", label: "Request Revision", variant: "destructive" });
      actions.push({ action: "delivered", label: "Deliver to Client", variant: "default" });
    }
    if (status === "in_revision") {
      actions.push({ action: "delivered", label: "Deliver to Client", variant: "default" });
    }
  }

  return actions;
}