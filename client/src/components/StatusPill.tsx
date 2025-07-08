import React from 'react';
import { getOrderStatus, getStatusLabel } from '@shared/utils';

const statusColors = {
  "Pending": "bg-gray-300 text-gray-800",
  "In Progress": "bg-yellow-300 text-yellow-900", 
  "Ready for QC": "bg-blue-300 text-blue-900",
  "In Revision": "bg-red-300 text-red-900",
  "Delivered": "bg-green-300 text-green-900"
};

interface StatusPillProps {
  order: {
    uploadedAt?: string | null;
    acceptedAt?: string | null;
    readyForQCAt?: string | null;
    revisionRequestedAt?: string | null;
    deliveredAt?: string | null;
    status?: string;
  };
}

export function StatusPill({ order }: StatusPillProps) {
  // Use timestamp-based status if available, otherwise fall back to legacy status
  const hasTimestamps = order.uploadedAt || order.acceptedAt || order.readyForQCAt || 
                       order.revisionRequestedAt || order.deliveredAt;
  let status = hasTimestamps ? getOrderStatus(order) : (order.status || 'pending');
  
  // Map legacy statuses to display statuses for correct colors
  if (status === 'editing') {
    status = 'in_progress';
  }
  if (status === 'ready_for_qa') {
    status = 'ready_for_qc';
  }
  
  const statusLabel = getStatusLabel(status);
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[statusLabel] || statusColors["Pending"]}`}>
      {statusLabel}
    </span>
  );
}