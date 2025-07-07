import { useState, useEffect, useRef } from "react";
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
  
  // Filters
  const [visibleEventTypes, setVisibleEventTypes] = useState({
    job: true,
    unavailable: true,
    external: true,
    holiday: true,
  });
  const [selectedPhotographer, setSelectedPhotographer] = useState("all");

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

  const { data: calendarEvents, isLoading: eventsLoading } = useQuery<CalendarEventExtended[]>({
    queryKey: ["/api/calendar/events", selectedPhotographer],
    queryFn: async () => {
      const url = selectedPhotographer === "all" 
        ? "/api/calendar/events" 
        : `/api/calendar/events?photographerId=${selectedPhotographer}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch calendar events");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: photographers } = useQuery<User[]>({
    queryKey: ["/api/photographers"],
    enabled: isAuthenticated,
  });

  const { data: businessSettings } = useQuery({
    queryKey: ["/api/business-settings"],
    enabled: isAuthenticated,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest("POST", "/api/calendar/events", eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      setIsEventModalOpen(false);
      setEventForm({
        title: "",
        type: "unavailable",
        start: "",
        end: "",
        allDay: false,
        description: "",
        photographerId: "",
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
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/calendar/events/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/calendar/events/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setEventForm(prev => ({
      ...prev,
      start: info.dateStr + "T09:00",
      end: info.dateStr + "T17:00",
      allDay: info.allDay,
    }));
    setIsEventModalOpen(true);
  };

  const handleEventClick = (info: any) => {
    const event = calendarEvents?.find(e => e.id.toString() === info.event.id);
    if (event) {
      setSelectedEvent(event);
    }
  };

  const handleEventDrop = (info: any) => {
    const eventId = parseInt(info.event.id);
    const updateData = {
      start: info.event.start,
      end: info.event.end || info.event.start,
    };
    
    updateEventMutation.mutate({ id: eventId, data: updateData });
  };

  const handleSubmitEvent = () => {
    if (!eventForm.title || !eventForm.start || !eventForm.end) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      ...eventForm,
      photographerId: eventForm.photographerId || null,
      color: eventTypeColors[eventForm.type as keyof typeof eventTypeColors],
    });
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  const toggleEventType = (type: string) => {
    setVisibleEventTypes(prev => ({
      ...prev,
      [type]: !prev[type as keyof typeof prev],
    }));
  };

  // Filter events based on visibility settings
  const filteredEvents = calendarEvents?.filter(event => {
    const typeVisible = visibleEventTypes[event.type as keyof typeof visibleEventTypes];
    const photographerMatch = selectedPhotographer === "all" || 
      event.photographerId === selectedPhotographer ||
      (!event.photographerId && selectedPhotographer === "all");
    return typeVisible && photographerMatch;
  }) || [];

  // Transform events for FullCalendar
  const calendarEventsFormatted = filteredEvents.map(event => ({
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
  }));

  if (authLoading || eventsLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopBar title="Calendar" />
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title="Calendar & Scheduling" />
        
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left Sidebar - Filters */}
          <div className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* View Controls */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    View
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      size="sm"
                      variant={currentView === "dayGridMonth" ? "default" : "outline"}
                      onClick={() => handleViewChange("dayGridMonth")}
                    >
                      Month
                    </Button>
                    <Button
                      size="sm"
                      variant={currentView === "timeGridWeek" ? "default" : "outline"}
                      onClick={() => handleViewChange("timeGridWeek")}
                    >
                      Week
                    </Button>
                    <Button
                      size="sm"
                      variant={currentView === "timeGridDay" ? "default" : "outline"}
                      onClick={() => handleViewChange("timeGridDay")}
                    >
                      Day
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Team Member Filter */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedPhotographer} onValueChange={setSelectedPhotographer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Members</SelectItem>
                      {photographers?.map((photographer) => (
                        <SelectItem key={photographer.id} value={photographer.id}>
                          {photographer.firstName} {photographer.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Event Type Filters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    Event Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(eventTypeLabels).map(([type, label]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={visibleEventTypes[type as keyof typeof visibleEventTypes]}
                        onCheckedChange={() => toggleEventType(type)}
                      />
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: eventTypeColors[type as keyof typeof eventTypeColors] }}
                        />
                        <Label htmlFor={type} className="text-sm">{label}</Label>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setIsEventModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Business Hours
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Calendar */}
          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg shadow-sm h-full">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={currentView}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                events={calendarEventsFormatted}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
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
          </div>
        </div>
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
                <Label htmlFor="photographer-select">Photographer</Label>
                <Select
                  value={eventForm.photographerId}
                  onValueChange={(value) => setEventForm(prev => ({ ...prev, photographerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select photographer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Photographers</SelectItem>
                    {photographers?.map((photographer) => (
                      <SelectItem key={photographer.id} value={photographer.id}>
                        {photographer.firstName} {photographer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start *</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={eventForm.start}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End *</Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={eventForm.end}
                    onChange={(e) => setEventForm(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-day"
                  checked={eventForm.allDay}
                  onCheckedChange={(checked) => setEventForm(prev => ({ ...prev, allDay: !!checked }))}
                />
                <Label htmlFor="all-day">All Day</Label>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description..."
                  className="h-20"
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
                onClick={handleSubmitEvent}
                disabled={createEventMutation.isPending}
                className="flex-1"
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
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
              <div className="flex items-center space-x-2">
                <Badge
                  style={{ backgroundColor: selectedEvent.color || eventTypeColors[selectedEvent.type as keyof typeof eventTypeColors] }}
                  className="text-white"
                >
                  {eventTypeLabels[selectedEvent.type as keyof typeof eventTypeLabels]}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Time:</p>
                <p className="text-sm text-slate-600">
                  {new Date(selectedEvent.start).toLocaleString()} - {new Date(selectedEvent.end).toLocaleString()}
                </p>
              </div>

              {selectedEvent.photographer && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Photographer:</p>
                  <p className="text-sm text-slate-600">
                    {selectedEvent.photographer.firstName} {selectedEvent.photographer.lastName}
                  </p>
                </div>
              )}

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
              {selectedEvent.type !== "job" && (
                <Button
                  variant="destructive"
                  onClick={() => deleteEventMutation.mutate(selectedEvent.id)}
                  disabled={deleteEventMutation.isPending}
                  className="flex-1"
                >
                  {deleteEventMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}