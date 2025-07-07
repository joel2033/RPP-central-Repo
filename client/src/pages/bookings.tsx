import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, Camera, MapPin, User } from "lucide-react";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import BookingModal from "@/components/modals/booking-modal";
import type { Booking, Client, User as UserType } from "@shared/schema";

interface BookingWithDetails extends Booking {
  client: Client;
  photographer: UserType | null;
}

export default function Bookings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      await apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    },
  });

  const filteredBookings = bookings?.filter(booking =>
    booking.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.photographer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddBooking = () => {
    setSelectedBooking(null);
    setIsModalOpen(true);
  };

  const handleEditBooking = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleDeleteBooking = (bookingId: number) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      deleteBookingMutation.mutate(bookingId);
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

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "photography":
        return <Camera className="h-4 w-4" />;
      case "drone":
        return <Camera className="h-4 w-4" />;
      case "floor_plans":
        return <MapPin className="h-4 w-4" />;
      case "video":
        return <Camera className="h-4 w-4" />;
      default:
        return <Camera className="h-4 w-4" />;
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:ml-64">
        <TopBar title="Bookings" />
        <main className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Booking Management</h2>
              <p className="text-slate-600">Manage photography, drone, and video bookings</p>
            </div>
            <Button onClick={handleAddBooking} className="bg-brand-blue hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bookings List */}
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No bookings found"
              description={searchTerm ? "No bookings match your search criteria" : "Create your first booking to get started"}
              action={
                !searchTerm ? (
                  <Button onClick={handleAddBooking} className="bg-brand-blue hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Booking
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{booking.client.name}</CardTitle>
                      <Badge className={getStatusColor(booking.status || "pending")}>
                        {booking.status || "pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-slate-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {booking.propertyAddress}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {booking.scheduledDate} {booking.scheduledTime && `at ${booking.scheduledTime}`}
                    </div>
                    {booking.photographer && (
                      <div className="flex items-center text-sm text-slate-600">
                        <User className="h-4 w-4 mr-2" />
                        {booking.photographer.firstName} {booking.photographer.lastName}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {booking.services.map((service) => (
                        <div
                          key={service}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-xs"
                        >
                          {getServiceIcon(service)}
                          <span className="capitalize">{service.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                    {booking.price && (
                      <div className="text-sm font-medium text-slate-900">
                        ${booking.price}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBooking(booking)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Booking Modal */}
          <BookingModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            booking={selectedBooking}
          />
        </main>
      </div>
    </div>
  );
}
