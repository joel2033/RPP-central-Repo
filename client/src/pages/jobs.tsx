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
import JobStatusPanel from "@/components/job-status-panel";
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
  };
  photographer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  editor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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
        <div className="flex-1 flex flex-col ml-64">
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
      <div className="flex-1 flex flex-col ml-64">
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
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Building className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
                    <p className="text-gray-600 text-center mb-4">
                      {searchTerm || statusFilter !== "all" 
                        ? "No jobs match your current filters. Try adjusting your search or filters."
                        : "You haven't created any jobs yet. Jobs are automatically created when you add bookings."
                      }
                    </p>
                    <Button asChild>
                      <Link to="/bookings">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Booking
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sortedJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {job.booking?.propertyAddress || "Unknown Address"}
                            </h3>
                            <Badge className={cn("text-xs", statusColors[job.jobStatus as keyof typeof statusColors])}>
                              {statusLabels[job.jobStatus as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Job ID: {job.jobId}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{job.client?.name || "Unknown Client"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {job.booking?.scheduledDate 
                                  ? formatDate(job.booking.scheduledDate)
                                  : "Date TBD"
                                }
                                {job.booking?.scheduledTime && (
                                  <span className="ml-1">
                                    at {formatTime(job.booking.scheduledTime)}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/jobs/${job.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                View Files
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Edit Job
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Send to Production
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                Cancel Job
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Services */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Services:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.requestedServices?.map((service: string) => (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {service.charAt(0).toUpperCase() + service.slice(1).replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Quick Status Panel */}
                      <div className="mb-4">
                        <JobStatusPanel 
                          jobId={job.id}
                          currentStatus={job.status}
                          jobStatus={job.jobStatus}
                          compact={true}
                        />
                      </div>
                      
                      {/* Additional Info */}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div>
                          Created: {formatDate(job.createdAt)}
                        </div>
                        <div className="flex items-center gap-4">
                          {job.photographerId && (
                            <span>Photographer: {job.photographerId}</span>
                          )}
                          {job.editorId && (
                            <span>Editor: {job.editorId}</span>
                          )}
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
    </div>
  );
}