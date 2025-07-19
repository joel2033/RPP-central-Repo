import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { JobIdBadge } from "@/components/JobIdBadge";
import { UnifiedFileManagement } from "@/components/UnifiedFileManagement";

interface JobCardDetails {
  id: number;
  jobId: string | null;
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
  ready_for_qc: "bg-orange-100 text-orange-800",
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

  // Gallery modal state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [galleryFiles, setGalleryFiles] = useState<ProductionFile[]>([]);

  const openGallery = (fileId: number, files: ProductionFile[]) => {
    const index = files.findIndex(f => f.id === fileId);
    setSelectedFileIndex(index);
    setGalleryFiles(files);
    setGalleryOpen(true);
  };

  const getFileUrl = (file: ProductionFile) => {
    if (file.filePath?.startsWith('http')) {
      return file.filePath;
    }
    return `https://rppcentral.s3.ap-southeast-2.amazonaws.com/${file.filePath}`;
  };

  const getThumbnailUrl = (file: ProductionFile) => {
    // For S3 files, try to get thumbnail by adding 'thumb_' prefix
    if (file.filePath) {
      const pathParts = file.filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const thumbPath = pathParts.slice(0, -1).join('/') + '/thumb_' + fileName;
      return `https://rppcentral.s3.ap-southeast-2.amazonaws.com/${thumbPath}`;
    }
    return null;
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
          <Card key={file.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div 
                className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-100"
                onClick={() => openGallery(file.id, files)}
              >
                {file.mimeType?.startsWith('image/') ? (
                  <img 
                    src={getThumbnailUrl(file) || getFileUrl(file)} 
                    alt={file.originalName || file.fileName}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                    onError={(e) => {
                      // Fallback to original file if thumbnail fails
                      const target = e.target as HTMLImageElement;
                      if (target.src !== getFileUrl(file)) {
                        target.src = getFileUrl(file);
                      }
                    }}
                  />
                ) : file.mimeType?.startsWith('video/') ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <FolderOpen className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-sm font-medium truncate" title={file.originalName}>
                {file.originalName || file.fileName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'} • {new Date(file.uploadedAt).toLocaleDateString()}
              </p>
              <div className="flex gap-1 mt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGallery(file.id, files);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(getFileUrl(file), '_blank');
                  }}
                >
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
          <div className="flex items-center gap-2 mt-2">
            <JobIdBadge 
              jobCardId={jobCard.id} 
              jobId={jobCard.jobId} 
              showAssignButton={true}
            />
          </div>
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

        {/* Right Column - Files & Media Management */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Files & Media</CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedFileManagement jobCardId={jobCard.id} />
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

      {/* Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              {galleryFiles[selectedFileIndex]?.originalName || galleryFiles[selectedFileIndex]?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {galleryFiles[selectedFileIndex] && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {galleryFiles[selectedFileIndex]?.mimeType?.startsWith('image/') ? (
                    <img 
                      src={getFileUrl(galleryFiles[selectedFileIndex])}
                      alt={galleryFiles[selectedFileIndex].originalName || galleryFiles[selectedFileIndex].fileName}
                      className="w-full h-full object-contain"
                    />
                  ) : galleryFiles[selectedFileIndex]?.mimeType?.startsWith('video/') ? (
                    <video 
                      src={getFileUrl(galleryFiles[selectedFileIndex])}
                      controls
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Gallery Navigation */}
                {galleryFiles.length > 1 && (
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedFileIndex(Math.max(0, selectedFileIndex - 1))}
                      disabled={selectedFileIndex === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      {selectedFileIndex + 1} of {galleryFiles.length}
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedFileIndex(Math.min(galleryFiles.length - 1, selectedFileIndex + 1))}
                      disabled={selectedFileIndex === galleryFiles.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                )}
                
                {/* File Details */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">File Size:</span> {galleryFiles[selectedFileIndex]?.fileSize ? `${(galleryFiles[selectedFileIndex].fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {galleryFiles[selectedFileIndex]?.mimeType || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Uploaded:</span> {new Date(galleryFiles[selectedFileIndex]?.uploadedAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {galleryFiles[selectedFileIndex]?.serviceCategory}
                    </div>
                  </div>
                </div>
                
                {/* Download Button */}
                <Button 
                  className="w-full"
                  onClick={() => window.open(getFileUrl(galleryFiles[selectedFileIndex]), '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}