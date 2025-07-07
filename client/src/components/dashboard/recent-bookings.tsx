import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Video, MapPin, Bot } from "lucide-react";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { Booking, Client, User } from "@shared/schema";

interface BookingWithDetails extends Booking {
  client: Client;
  photographer: User | null;
}

export default function RecentBookings() {
  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    select: (data) => data?.slice(0, 5) || [], // Show only first 5 bookings
  });

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "photography":
        return <Camera className="h-4 w-4 text-white" />;
      case "drone":
        return <Bot className="h-4 w-4 text-white" />;
      case "floor_plans":
        return <MapPin className="h-4 w-4 text-white" />;
      case "video":
        return <Video className="h-4 w-4 text-white" />;
      default:
        return <Camera className="h-4 w-4 text-white" />;
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case "photography":
        return "bg-brand-blue";
      case "drone":
        return "bg-green-500";
      case "floor_plans":
        return "bg-purple-500";
      case "video":
        return "bg-red-500";
      default:
        return "bg-brand-blue";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          <Button variant="link" size="sm" className="text-brand-blue">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : !bookings || bookings.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No recent bookings"
            description="New bookings will appear here"
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getServiceColor(booking.services[0])}`}>
                    {getServiceIcon(booking.services[0])}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{booking.client.name}</p>
                    <p className="text-xs text-slate-500">{booking.propertyAddress}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(booking.scheduledDate).toLocaleDateString()}
                  </p>
                  <Badge className={getStatusColor(booking.status || "pending")}>
                    {booking.status || "pending"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
