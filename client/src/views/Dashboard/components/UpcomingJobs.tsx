import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { formatDate, formatServiceName } from '@/utils/formatting';
import { API_ENDPOINTS } from '@/utils/constants';
import { StatusBadge } from '@/components/common/StatusBadge';

interface UpcomingJob {
  id: number;
  jobId: string;
  client: { name: string };
  booking?: {
    propertyAddress: string;
    scheduledDate: string;
    scheduledTime: string;
  };
  services: string[];
  status: string;
}

export const UpcomingJobs = memo(() => {
  const { data: jobs, isLoading } = useQuery<UpcomingJob[]>({
    queryKey: [API_ENDPOINTS.JOBS, { status: 'upcoming', limit: 5 }],
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jobs?.map((job) => (
            <div key={job.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{job.jobId}</span>
                <StatusBadge status={job.status} variant="production" size="sm" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{job.client.name}</p>
              {job.booking && (
                <>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{job.booking.propertyAddress}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(job.booking.scheduledDate)} at {job.booking.scheduledTime}
                    </span>
                  </div>
                </>
              )}
              {job.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {job.services.slice(0, 2).map((service, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {formatServiceName(service)}
                    </Badge>
                  ))}
                  {job.services.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{job.services.length - 2} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming jobs</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

UpcomingJobs.displayName = 'UpcomingJobs';