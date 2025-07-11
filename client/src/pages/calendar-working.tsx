import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar as CalendarIcon,
  Clock,
  Users,
  Settings,
  Filter,
  Plus,
  Eye,
  EyeOff
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { CalendarEvent, User, Booking } from "@shared/schema";

interface CalendarEventExtended extends CalendarEvent {
  photographer?: User;
  booking?: Booking;
}

const eventTypeColors = {
  job: "#3b82f6", // blue
  unavailable: "#ef4444", // red
  external: "#8b5cf6", // purple
  holiday: "#f59e0b", // amber
};

const eventTypeLabels = {
  job: "Jobs",
  unavailable: "Unavailable",
  external: "External Events",
  holiday: "Holidays",
};

export default function Calendar() {
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventExtended | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [eventForm, setEventForm] = useState({
    title: "",
    type: "unavailable",
    start: "",
    end: "",
    allDay: false,
    description: "",
    photographerId: "",
  });

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
  }, [authLoading, isAuthenticated, toast]);

  // Fetch calendar events
  const { data: calendarEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/calendar/events"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      } else {
        toast({
          title: "Error Loading Events",
          description: "Failed to load calendar events. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Fetch users/photographers
  const { data: photographers } = useQuery({
    queryKey: ["/api/users/photographers"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      }
    },
  });

  // Fetch business settings
  const { data: businessSettings } = useQuery({
    queryKey: ["/api/business-settings"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      }
    },
  });

  // Transform events for FullCalendar
  const calendarEventsFormatted = calendarEvents?.map((event: any) => ({
    id: event.id.toString(),
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color || eventTypeColors[event.type as keyof typeof eventTypeColors],
    borderColor: event.color || eventTypeColors[event.type as keyof typeof eventTypeColors],
    textColor: "#ffffff",
    extendedProps: {
      type: event.type,
      description: event.description,
      photographerId: event.photographerId,
    },
  })) || [];

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setEventForm(prev => ({
      ...prev,
      start: arg.dateStr,
      end: arg.dateStr,
    }));
    setIsEventModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    const event = calendarEvents?.find((e: any) => e.id.toString() === arg.event.id);
    if (event) {
      setSelectedEvent(event);
    }
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  if (authLoading || eventsLoading) {
    return (
      <Layout title="Calendar">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Calendar & Scheduling">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">Manage your appointments and schedule</p>
          </div>
          <Button onClick={() => setIsEventModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar View Controls */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                View
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  size="sm"
                  variant={currentView === "dayGridMonth" ? "default" : "outline"}
                  onClick={() => handleViewChange("dayGridMonth")}
                  className="w-full justify-start"
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={currentView === "timeGridWeek" ? "default" : "outline"}
                  onClick={() => handleViewChange("timeGridWeek")}
                  className="w-full justify-start"
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={currentView === "timeGridDay" ? "default" : "outline"}
                  onClick={() => handleViewChange("timeGridDay")}
                  className="w-full justify-start"
                >
                  Day
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <div className="h-[600px]">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView={currentView}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: false,
                  }}
                  events={calendarEventsFormatted}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  editable={true}
                  droppable={true}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={true}
                  height="100%"
                  businessHours={businessSettings?.businessHours || {
                    daysOfWeek: [1, 2, 3, 4, 5],
                    startTime: "08:00",
                    endTime: "18:00",
                  }}
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  eventTimeFormat={{
                    hour: "numeric",
                    minute: "2-digit",
                    meridiem: "short",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Creation Modal */}
        {isEventModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">
                {selectedDate ? `Add Event - ${selectedDate}` : "Add Event"}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="event-title">Title *</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Event title..."
                  />
                </div>

                <div>
                  <Label htmlFor="event-type">Type</Label>
                  <Select
                    value={eventForm.type}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="external">External Event</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Event description..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsEventModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Handle event creation
                    toast({
                      title: "Event Created",
                      description: "Event has been added to your calendar.",
                    });
                    setIsEventModalOpen(false);
                  }}
                  className="flex-1"
                >
                  Create Event
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">{selectedEvent.title}</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Type:</p>
                  <Badge variant="outline">
                    {eventTypeLabels[selectedEvent.type as keyof typeof eventTypeLabels]}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">Time:</p>
                  <p className="text-sm text-slate-600">
                    {new Date(selectedEvent.start).toLocaleString()} - {new Date(selectedEvent.end).toLocaleString()}
                  </p>
                </div>

                {selectedEvent.description && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Description:</p>
                    <p className="text-sm text-slate-600">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}