import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  Building, 
  Plus,
  Filter,
  Eye,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface JobCardWithDetails {
  id: number;
  jobId: string;
  bookingId: number;
  clientId: number;
  photographerId?: string;
  editorId?: string;
  status: string;
  jobStatus: string;
  requestedServices: any;
  editingNotes?: string;
  revisionNotes?: string;
  assignedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  licenseeId: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contactName?: string;
  };
  photographer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  editor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  booking: {
    id: number;
    propertyAddress: string;
    scheduledDate: string;
    scheduledTime: string;
    duration?: number;
    services: string[];
    totalPrice: number;
  };
}

const statusColors = {
  upcoming: "bg-blue-100 text-blue-800",
  booked: "bg-green-100 text-green-800", 
  in_progress: "bg-yellow-100 text-yellow-800",
  editing: "bg-purple-100 text-purple-800",
  ready_for_qa: "bg-orange-100 text-orange-800",
  in_revision: "bg-red-100 text-red-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels = {
  upcoming: "Upcoming",
  booked: "Booked",
  in_progress: "In Progress", 
  editing: "Editing",
  ready_for_qa: "Ready for QA",
  in_revision: "In Revision",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function JobsPage() {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "upcoming">("newest");

  const { data: jobCards, isLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const response = await fetch("/api/jobs");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Filter and sort jobs
  const filteredJobs = jobCards?.filter(job => {
    const matchesSearch = 
      job.booking.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.jobStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.booking.scheduledDate).getTime() - new Date(b.booking.scheduledDate).getTime();
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading jobs...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
                <p className="text-gray-600">Manage all your photography jobs</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Job
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by address, job ID, or client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          {statusFilter === "all" ? "All Jobs" : statusLabels[statusFilter as keyof typeof statusLabels]}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                          All Jobs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("upcoming")}>
                          Upcoming
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("delivered")}>
                          Delivered
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter("in_revision")}>
                          In Revision
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Sort: {sortBy === "newest" ? "Newest" : "Upcoming"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSortBy("newest")}>
                          Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("upcoming")}>
                          Upcoming First
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {sortedJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 text-lg">No jobs found</div>
              <p className="text-gray-400 mt-2">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Create your first job to get started"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Main Job Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {job.booking.propertyAddress}
                          </h3>
                          <Badge 
                            className={cn("text-xs", statusColors[job.jobStatus as keyof typeof statusColors])}
                          >
                            {statusLabels[job.jobStatus as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 font-mono">
                          Job ID: {job.jobId}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(job.booking.scheduledDate)} at {formatTime(job.booking.scheduledTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Building className="h-4 w-4 mr-2" />
                        <span>{job.client.name}</span>
                      </div>
                      
                      {job.photographer && (
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>{job.photographer.firstName} {job.photographer.lastName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.booking.services.map((service, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Job
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          Edit Job
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          View Files
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Send to Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Cancel Job
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
          </div>
        </div>
      </div>
    </div>
  );
}