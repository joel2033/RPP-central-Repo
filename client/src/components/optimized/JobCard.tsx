import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, DollarSign } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime, formatCurrency, formatServiceName } from '@/utils/formatting';
import type { JobCard as JobCardType, Client } from '@shared/schema';

interface JobCardProps {
  jobCard: JobCardType & { client: Client; booking?: any };
  onClick?: (jobCard: JobCardType) => void;
}

const JobCard = memo(({ jobCard, onClick }: JobCardProps) => {
  const handleClick = () => onClick?.(jobCard);

  return (
    <Card 
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{jobCard.jobId}</CardTitle>
          <StatusBadge status={jobCard.status} variant="production" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          {jobCard.client.name}
        </div>
        
        {jobCard.booking && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              {jobCard.booking.propertyAddress}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {formatDateTime(jobCard.booking.scheduledDate, jobCard.booking.scheduledTime)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(jobCard.booking.price)}
            </div>
          </>
        )}

        {jobCard.services && jobCard.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {jobCard.services.map((service, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {formatServiceName(service)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

JobCard.displayName = 'JobCard';

export default JobCard;