import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { Booking, Client, User } from "@shared/schema";

interface BookingWithDetails extends Booking {
  client: Client;
  photographer: User | null;
}

export default function UpcomingJobs() {
  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    select: (data) => {
      // Filter for upcoming bookings (future dates)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return data
        ?.filter(booking => {
          const bookingDate = new Date(booking.scheduledDate);
          return bookingDate >= today && booking.status !== 'cancelled';
        })
        .slice(0, 5) || []; // Show only first 5 upcoming jobs
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
    };
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Jobs</CardTitle>
          <Button variant="link" size="sm" className="text-brand-blue">
            View Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : !bookings || bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming jobs"
            description="Scheduled jobs will appear here"
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const { month, day } = formatDate(booking.scheduledDate);
              
              return (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">{month}</p>
                      <p className="text-lg font-bold text-brand-blue">{day}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {booking.client.name} - {booking.propertyAddress}
                      </p>
                      <p className="text-xs text-slate-500">
                        {booking.services.map(s => s.replace('_', ' ')).join(' + ')}
                      </p>
                      {booking.photographer && (
                        <p className="text-xs text-slate-500">
                          Assigned to: {booking.photographer.firstName} {booking.photographer.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {booking.scheduledTime || "TBD"}
                    </p>
                    <Badge className={getStatusColor(booking.status || "pending")}>
                      {booking.status || "pending"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
