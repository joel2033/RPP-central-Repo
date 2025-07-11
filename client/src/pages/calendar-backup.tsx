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

export default function Calendar() {
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  
  const [currentView, setCurrentView] = useState("dayGridMonth");

  if (authLoading) {
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Calendar Loading</h3>
                <p className="text-gray-600">Full calendar functionality will be restored shortly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}