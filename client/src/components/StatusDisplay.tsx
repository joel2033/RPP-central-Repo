import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getOrderStatus, getStatusLabel, getStatusColor } from '@shared/utils';

interface StatusDisplayProps {
  jobCard: {
    uploadedAt?: string | null;
    acceptedAt?: string | null;
    readyForQCAt?: string | null;
    revisionRequestedAt?: string | null;
    deliveredAt?: string | null;
    // Legacy status field for backward compatibility
    status?: string;
  };
  showTimestamp?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  jobCard,
  showTimestamp = false,
  size = 'default'
}) => {
  // Use new action-based status if timestamps are available
  const hasTimestamps = jobCard.uploadedAt || jobCard.acceptedAt || jobCard.readyForQCAt || 
                       jobCard.revisionRequestedAt || jobCard.deliveredAt;
  
  const status = hasTimestamps ? getOrderStatus(jobCard) : (jobCard.status || 'pending');
  const label = getStatusLabel(status);
  const colorClass = getStatusColor(status);

  // Get the most recent timestamp for display
  const getLatestTimestamp = () => {
    const timestamps = [
      { date: jobCard.deliveredAt, label: 'Delivered' },
      { date: jobCard.revisionRequestedAt, label: 'Revision Requested' },
      { date: jobCard.readyForQCAt, label: 'Ready for QC' },
      { date: jobCard.acceptedAt, label: 'Accepted' },
      { date: jobCard.uploadedAt, label: 'Uploaded' }
    ].filter(t => t.date);

    return timestamps[0]; // Most recent
  };

  const latestTimestamp = showTimestamp ? getLatestTimestamp() : null;

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant="secondary" 
        className={`${colorClass} ${size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : ''}`}
      >
        {label}
      </Badge>
      {latestTimestamp && (
        <span className="text-xs text-gray-500">
          {latestTimestamp.label}: {new Date(latestTimestamp.date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};