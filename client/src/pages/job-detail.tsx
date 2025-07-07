import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  DollarSign, 
  FileText, 
  Upload, 
  Download,
  MoreHorizontal,
  ExternalLink,
  Camera,
  Building,
  Video,
  Globe,
  Folder,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  X,
  Check
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import DeliverySettingsModal from "@/components/delivery-settings-modal";

interface JobDetail {
  id: number;
  jobId: string;
  bookingId: number;
  clientId: number;
  photographerId?: string;
  editorId?: string;
  status: string;
  jobStatus: string;
  requestedServices: string[];
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
    contactName?: string;
    editingPreferences?: any;
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
    notes?: string;
  };
}

interface ProductionFile {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mediaType: string;
  serviceCategory?: string;
  uploadedAt: string;
}

interface ActivityLogEntry {
  id: number;
  userId: string;
  action: string;
  description: string;
  createdAt: string;
  metadata?: any;
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
  ready_for_qa: "Ready for Pre-Delivery Check",
  in_revision: "In Revision",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function JobDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  console.log("Job Detail Page - ID from params:", id);
  
  const [activeTab, setActiveTab] = useState("photos");
  const [showActivity, setShowActivity] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [preferencesText, setPreferencesText] = useState("");

  // Fetch job details
  const { data: job, isLoading, error } = useQuery<JobDetail>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      console.log("Fetching job details for ID:", id);
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) {
        console.error("Failed to fetch job:", response.status, response.statusText);
        throw new Error("Failed to fetch job details");
      }
      const data = await response.json();
      console.log("Received job data:", data);
      return data;
    },
    enabled: isAuthenticated && !!id,
  });

  // Fetch production files
  const { data: files = [] } = useQuery<ProductionFile[]>({
    queryKey: ["/api/jobs", id, "files"],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${id}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: isAuthenticated && !!id,
  });

  // Fetch activity log
  const { data: activities = [] } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/jobs", id, "activity"],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${id}/activity`);
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
    enabled: isAuthenticated && !!id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFilesByCategory = (category: string) => {
    return files.filter(file => file.serviceCategory === category || file.mediaType === category);
  };

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading job details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg text-red-600 mb-2">Failed to load job details</div>
              <p className="text-gray-600">Job ID: {id}</p>
              <p className="text-sm text-gray-500 mt-2">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg text-red-600">Job not found</div>
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
          <div className="container mx-auto p-6 max-w-6xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
              <Link to="/jobs" className="hover:text-gray-900">Jobs</Link>
              <span>/</span>
              <span className="text-gray-900">{job.jobId}</span>
            </div>

            {/* Header Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Map and Address */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-0">
                    <div className="h-64 bg-gray-100 rounded-t-lg relative">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyA0s1a7phLN0iaD6-UE7m4qP-z21pH0eSc&q=${encodeURIComponent(job.booking.propertyAddress)}`}
                        className="w-full h-full rounded-t-lg"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                      <Button 
                        size="sm" 
                        className="absolute top-4 right-4"
                        asChild
                      >
                        <a href={getGoogleMapsUrl(job.booking.propertyAddress)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Maps
                        </a>
                      </Button>
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {job.booking.propertyAddress}
                          </h1>
                          <p className="text-gray-600 mb-4">Job ID: {job.jobId}</p>
                          <Badge className={cn("text-sm", statusColors[job.jobStatus as keyof typeof statusColors])}>
                            {statusLabels[job.jobStatus as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {job.jobStatus === 'ready_for_qa' && (
                            <Button>
                              <Check className="h-4 w-4 mr-2" />
                              Deliver Job
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Edit Job</DropdownMenuItem>
                              <DropdownMenuItem>Send to Production</DropdownMenuItem>
                              <DropdownMenuItem>Download All Files</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Cancel Job</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Job Status and Quick Actions */}
              <div className="space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">{job.client.name}</p>
                        <p className="text-sm text-gray-600">{job.client.contactName}</p>
                      </div>
                      {job.client.email && (
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="text-sm text-gray-900">{job.client.email}</p>
                        </div>
                      )}
                      {job.client.phone && (
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="text-sm text-gray-900">{job.client.phone}</p>
                        </div>
                      )}
                      
                      {/* Client Preferences */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Client Preferences</p>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingPreferences(!editingPreferences);
                              setPreferencesText(job.client.editingPreferences || "");
                            }}
                          >
                            {editingPreferences ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          </Button>
                        </div>
                        {editingPreferences ? (
                          <div className="space-y-2">
                            <Textarea
                              value={preferencesText}
                              onChange={(e) => setPreferencesText(e.target.value)}
                              placeholder="Enter client editing preferences..."
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingPreferences(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {job.client.editingPreferences || "No specific preferences noted"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Appointment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Appointment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          {formatDate(job.booking.scheduledDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          {formatTime(job.booking.scheduledTime)}
                          {job.booking.duration && ` (${job.booking.duration} min)`}
                        </span>
                      </div>
                      {job.photographer && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-900">
                            {job.photographer.firstName} {job.photographer.lastName}
                          </span>
                        </div>
                      )}
                      {job.booking.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-500 mb-1">Notes</p>
                          <p className="text-sm text-gray-900">{job.booking.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Billing Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Billing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Invoice Status</span>
                        <Badge variant="outline">Draft</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="font-semibold text-gray-900">
                          ${job.booking?.totalPrice ? Number(job.booking.totalPrice).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Services */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.requestedServices.map((service) => (
                    <Badge key={service} variant="secondary">
                      {service.charAt(0).toUpperCase() + service.slice(1).replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* File Management Section */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Files & Media</CardTitle>
                  <DeliverySettingsModal jobCardId={jobDetail.id} files={files} />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="photos" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Photos
                    </TabsTrigger>
                    <TabsTrigger value="floor_plans" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Floor Plans
                    </TabsTrigger>
                    <TabsTrigger value="video" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </TabsTrigger>
                    <TabsTrigger value="virtual_tour" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Virtual Tour
                    </TabsTrigger>
                    <TabsTrigger value="other" className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Other
                    </TabsTrigger>
                  </TabsList>

                  {['photos', 'floor_plans', 'video', 'virtual_tour', 'other'].map((category) => (
                    <TabsContent key={category} value={category} className="mt-6">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                        <div className="text-center">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Drop files here or click to upload
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Upload {category.replace('_', ' ')} files for this job
                          </p>
                          <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose Files
                          </Button>
                        </div>
                        
                        {/* Display existing files */}
                        {getFilesByCategory(category).length > 0 && (
                          <div className="mt-6 pt-6 border-t">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              {getFilesByCategory(category).map((file) => (
                                <div key={file.id} className="group relative">
                                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    {file.mediaType.startsWith('image/') ? (
                                      <img 
                                        src={file.filePath} 
                                        alt={file.fileName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <FileText className="h-8 w-8 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-gray-900 truncate">
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(file.fileSize)}
                                    </p>
                                  </div>
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="secondary" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem>
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600">
                                          <X className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Activity Log</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowActivity(!showActivity)}
                  >
                    {showActivity ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              {showActivity && (
                <CardContent>
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <p className="text-gray-600 text-center py-4">No activity recorded yet</p>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {activity.userId.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {activity.userId}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(activity.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}