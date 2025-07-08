import { cn } from '@/lib/utils';
import { JOB_STATUS_COLORS, PRODUCTION_STATUS_COLORS } from '@/utils/constants';
import { formatStatus } from '@/utils/formatting';

interface StatusBadgeProps {
  status: string;
  variant: 'job' | 'production';
  className?: string;
}

export const StatusBadge = ({ status, variant, className }: StatusBadgeProps) => {
  const colorMap = variant === 'job' ? JOB_STATUS_COLORS : PRODUCTION_STATUS_COLORS;
  const colorClass = colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
};