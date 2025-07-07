import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Calendar, 
  User, 
  Building, 
  DollarSign,
  Upload,
  Download,
  Eye,
  Clock,
  FileImage,
  Video,
  Map,
  FolderOpen,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JobCardDetails {
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

interface ProductionFile {
  id: number;
  jobCardId: number;
  fileName: string;
  originalName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  mediaType: string;
  serviceCategory: string;
  uploadedBy: string;
  instructions?: string;
  exportType?: string;
  customDescription?: string;
  uploadedAt: string;
  isActive: boolean;
}

interface ActivityLogEntry {
  id: number;
  jobCardId: number;
  userId: string;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
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

export default function JobCardPage() {
  const [, params] = useRoute("/jobs/:id");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("photos");
  const jobId = params?.id;

  const { data: jobCard, isLoading } = useQuery<JobCardDetails>({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json();
    },
    enabled: isAuthenticated && !!jobId,
  });

  const { data: productionFiles } = useQuery<ProductionFile[]>({
    queryKey: ["/api/jobs", jobId, "files"],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: isAuthenticated && !!jobId,
  });

  const { data: activityLog } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/jobs", jobId, "activity"],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/activity`);
      if (!response.ok) throw new Error("Failed to fetch activity log");
      return response.json();
    },
    enabled: isAuthenticated && !!jobId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(address)}`;
  };

  const getFilesByCategory = (category: string) => {
    return productionFiles?.filter(file => file.serviceCategory === category) || [];
  };

  const renderFileGrid = (files: ProductionFile[]) => {
    if (files.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No files uploaded yet</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                {file.mimeType?.startsWith('image/') ? (
                  <FileImage className="h-8 w-8 text-gray-400" />
                ) : file.mimeType?.startsWith('video/') ? (
                  <Video className="h-8 w-8 text-gray-400" />
                ) : (
                  <FolderOpen className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-medium truncate" title={file.originalName}>
                {file.originalName || file.fileName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(file.uploadedAt).toLocaleDateString()}
              </p>
              <div className="flex gap-1 mt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading job details...</div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500 text-lg">Job not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{jobCard.booking.propertyAddress}</h1>
          <p className="text-gray-600 font-mono">Job ID: {jobCard.jobId}</p>
        </div>
        <Badge className={statusColors[jobCard.jobStatus as keyof typeof statusColors]}>
          {statusLabels[jobCard.jobStatus as keyof typeof statusLabels]}
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Map and Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Google Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Property Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <Map className="h-12 w-12 text-gray-400" />
                <span className="ml-2 text-gray-500">Map View</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{jobCard.booking.propertyAddress}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(jobCard.booking.propertyAddress)}`, '_blank')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Open in Google Maps
              </Button>
            </CardContent>
          </Card>

          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Client Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Client Name</label>
                <p className="text-gray-900">{jobCard.client.name}</p>
              </div>
              {jobCard.client.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{jobCard.client.email}</p>
                </div>
              )}
              {jobCard.client.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{jobCard.client.phone}</p>
                </div>
              )}
              {jobCard.client.contactName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Person</label>
                  <p className="text-gray-900">{jobCard.client.contactName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Date & Time</label>
                <p className="text-gray-900">
                  {formatDate(jobCard.booking.scheduledDate)} at {formatTime(jobCard.booking.scheduledTime)}
                </p>
              </div>
              {jobCard.booking.duration && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Duration</label>
                  <p className="text-gray-900">{jobCard.booking.duration} minutes</p>
                </div>
              )}
              {jobCard.photographer && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Photographer</label>
                  <p className="text-gray-900">
                    {jobCard.photographer.firstName} {jobCard.photographer.lastName}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Services</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobCard.booking.services.map((service, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Billing Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold">${jobCard.booking.totalPrice}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Invoice Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Content Management */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Manage Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="photos">Photos</TabsTrigger>
                  <TabsTrigger value="floorplan">Floor Plan</TabsTrigger>
                  <TabsTrigger value="virtual">Virtual Tour</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="other">Other Files</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="photos">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Photography Files</h3>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photos
                        </Button>
                      </div>
                      {renderFileGrid(getFilesByCategory("photography"))}
                    </div>
                  </TabsContent>

                  <TabsContent value="floorplan">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Floor Plan Files</h3>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Floor Plans
                        </Button>
                      </div>
                      {renderFileGrid(getFilesByCategory("floor_plan"))}
                    </div>
                  </TabsContent>

                  <TabsContent value="virtual">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Virtual Tour Files</h3>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Virtual Tours
                        </Button>
                      </div>
                      {renderFileGrid(getFilesByCategory("virtual_tour"))}
                    </div>
                  </TabsContent>

                  <TabsContent value="video">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Video Files</h3>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Videos
                        </Button>
                      </div>
                      {renderFileGrid(getFilesByCategory("video"))}
                    </div>
                  </TabsContent>

                  <TabsContent value="other">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Other Files</h3>
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Files
                        </Button>
                      </div>
                      {renderFileGrid(getFilesByCategory("other"))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog && activityLog.length > 0 ? (
                  activityLog.map((entry) => (
                    <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          {entry.user.firstName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{entry.user.firstName} {entry.user.lastName}</span>
                          {' '}
                          {entry.description}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No activity recorded yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}