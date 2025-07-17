import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Upload, 
  CheckCircle, 
  Clock, 
  Camera,
  FileText,
  MapPin,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Activity,
  AlertCircle,
  Package,
  Eye,
  Archive
} from "lucide-react";
import { S3FileUpload } from "@/components/S3FileUpload";
import { formatDate } from "@/lib/utils";
import type { JobCard, Client, User as UserType, ProductionFile, JobActivityLog } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: UserType | null;
  booking?: {
    id: number;
    propertyAddress: string;
    scheduledDate: string;
    scheduledTime: string;
    price: string;
  };
  files?: ProductionFile[];
  activityLog?: JobActivityLog[];
}

interface EditorJobCardProps {
  job: JobCardWithDetails;
  onStatusChange?: (jobId: number, newStatus: string) => void;
}

const editorStatuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Camera },
  { value: 'editing', label: 'Editing', color: 'bg-purple-100 text-purple-800', icon: FileText },
  { value: 'ready_for_qc', label: 'Ready for QC', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'in_revision', label: 'In Revision', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800', icon: Package },
];

export default function EditorJobCard({ job, onStatusChange }: EditorJobCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionReply, setRevisionReply] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Handle unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser error
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Fetch raw files for download
  const { data: rawFiles, isLoading: rawFilesLoading } = useQuery<ProductionFile[]>({
    queryKey: ["/api/job-cards", job.id, "files", "raw"],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/job-cards/${job.id}/files?mediaType=raw`);
      return response;
    },
  });

  // Fetch final files
  const { data: finalFiles } = useQuery<ProductionFile[]>({
    queryKey: ["/api/job-cards", job.id, "files", "final"],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/job-cards/${job.id}/files?mediaType=final`);
      return response;
    },
  });

  // Fetch activity log
  const { data: activityLog } = useQuery<JobActivityLog[]>({
    queryKey: ["/api/job-cards", job.id, "activity"],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/job-cards/${job.id}/activity`);
      return response;
    },
  });

  // Download raw files mutation
  const downloadRawFilesMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await fetch(`/api/job-cards/${job.id}/download-raw-files`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to download raw files: ${response.status} - ${errorText}`);
        }
        
        // Check if response is JSON (single file) or blob (ZIP file)
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // Single file - return JSON with download URL
          const data = await response.json();
          return { type: 'single', data };
        } else {
          // Multiple files - return blob for ZIP download
          const blob = await response.blob();
          const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'raw_files.zip';
          return { type: 'zip', blob, filename };
        }
      } catch (error) {
        console.error('Download fetch error:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      try {
        if (result.type === 'single' && result.data.downloadUrl) {
          // Single file - open download URL in new tab
          window.open(result.data.downloadUrl, '_blank');
          toast({
            title: "Download Complete",
            description: "Raw file download has been initiated.",
          });
        } else if (result.type === 'zip') {
          // Multiple files - trigger ZIP download
          const url = window.URL.createObjectURL(result.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast({
            title: "Download Complete",
            description: `ZIP file with ${rawFiles?.length || 'multiple'} raw files has been downloaded.`,
          });
        }
        
        // Log download activity - handle errors gracefully
        setTimeout(() => {
          Promise.resolve().then(() => {
            try {
              logActivityMutation.mutate({
                action: 'raw_files_downloaded',
                description: 'Editor downloaded raw files for editing'
              });
            } catch (logError) {
              console.error('Error logging download activity:', logError);
            }
          }).catch(err => {
            console.error('Error in activity logging promise:', err);
          });
        }, 1000);
      } catch (successError) {
        console.error('Error in success handler:', successError);
        toast({
          title: "Download Warning",
          description: "Files downloaded but there was an issue with logging. Please refresh the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download raw files. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update job status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/job-cards/${job.id}`, {
        status,
        editingNotes: notes || job.editingNotes
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
      toast({
        title: "Status Updated",
        description: `Job status updated to ${editorStatuses.find(s => s.value === data.status)?.label}`,
      });
      onStatusChange?.(job.id, data.status);
      setStatusNotes('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    },
  });

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async ({ action, description }: { action: string; description: string }) => {
      const response = await apiRequest("POST", `/api/job-cards/${job.id}/activity`, {
        action,
        description
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards", job.id, "activity"] });
    },
    onError: (error) => {
      console.error('Error logging activity:', error);
      // Don't show error toast for activity logging failures
    },
  });

  // Submit revision response mutation
  const submitRevisionMutation = useMutation({
    mutationFn: async ({ reply, files }: { reply: string; files?: File[] }) => {
      // First submit the revision reply
      const response = await apiRequest("POST", `/api/job-cards/${job.id}/revision-reply`, {
        reply,
        status: 'editing' // Move back to editing status
      });
      
      // If files are provided, upload them
      if (files && files.length > 0) {
        // Upload files logic would go here
        // For now, just log the activity
        logActivityMutation.mutate({
          action: 'revision_files_uploaded',
          description: `Editor uploaded ${files.length} revised files`
        });
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
      toast({
        title: "Revision Submitted",
        description: "Your revision response has been submitted successfully.",
      });
      setRevisionReply('');
      setRevisionModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit revision response",
        variant: "destructive",
      });
    },
  });

  const currentStatus = editorStatuses.find(s => s.value === job.status) || editorStatuses[0];
  const StatusIcon = currentStatus.icon;

  const handleDownloadRawFiles = () => {
    if (rawFiles && rawFiles.length > 0) {
      // Show immediate feedback
      toast({
        title: "Download Starting",
        description: rawFiles.length > 1 
          ? `Creating ZIP file with ${rawFiles.length} files - this may take a moment...`
          : "Preparing download...",
      });
      downloadRawFilesMutation.mutate();
    } else {
      toast({
        title: "No Files Available",
        description: "No raw files are available for download.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({ status: newStatus, notes: statusNotes });
  };

  const handleFileUploadComplete = (files: File[]) => {
    setUploadModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/job-cards", job.id, "files"] });
    toast({
      title: "Files Uploaded",
      description: `${files.length} file(s) uploaded successfully.`,
    });
    
    // Log upload activity
    logActivityMutation.mutate({
      action: 'finished_files_uploaded',
      description: `Editor uploaded ${files.length} finished files`
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Job #{job.jobId || 'No ID'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {job.booking?.propertyAddress || 'No address available'}
            </p>
          </div>
          <Badge className={`${currentStatus.color} flex items-center gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {currentStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Job Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Client:</span>
              <span>{job.client?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Property:</span>
              <span>{job.booking?.propertyAddress || 'No address'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Scheduled:</span>
              <span>{job.booking?.scheduledDate || 'No date'} at {job.booking?.scheduledTime || 'No time'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              <span className="font-medium">Services:</span>
              <span>{job.requestedServices?.join(', ') || 'None'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Value:</span>
              <span>${job.booking?.price || '0.00'}</span>
            </div>
          </div>
        </div>

        {/* Editor Instructions */}
        {job.editingNotes && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Editor Instructions:</h4>
            <p className="text-sm text-blue-800">{job.editingNotes}</p>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleDownloadRawFiles}
            disabled={!rawFiles || rawFiles.length === 0 || downloadRawFilesMutation.isPending}
            className="flex items-center gap-2"
          >
            {downloadRawFilesMutation.isPending ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                {rawFiles && rawFiles.length > 1 ? 'Creating ZIP...' : 'Downloading...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Raw Files
              </>
            )}
            {rawFiles && rawFiles.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {rawFiles.length}
              </Badge>
            )}
          </Button>

          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Finished Files
                {finalFiles && finalFiles.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {finalFiles.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Finished Files</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <S3FileUpload
                  jobCardId={job.id}
                  mediaType="final"
                  onUploadComplete={handleFileUploadComplete}
                  onUploadError={(error) => console.error('Upload error:', error)}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                View Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Job Activity Log</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {activityLog?.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(log.createdAt)} by {log.user?.firstName} {log.user?.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!activityLog || activityLog.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No activity recorded yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {job.status === 'in_revision' && (
            <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-red-200 text-red-700">
                  <MessageSquare className="h-4 w-4" />
                  Handle Revision
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Revision Response</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="revision-reply">Your Response</Label>
                    <Textarea
                      id="revision-reply"
                      placeholder="Describe the changes you've made or ask for clarification..."
                      value={revisionReply}
                      onChange={(e) => setRevisionReply(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRevisionModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => submitRevisionMutation.mutate({ reply: revisionReply })}
                      disabled={!revisionReply.trim() || submitRevisionMutation.isPending}
                    >
                      {submitRevisionMutation.isPending ? 'Submitting...' : 'Submit Response'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Separator />

        {/* Status Management */}
        <div className="space-y-4">
          <h4 className="font-medium">Status Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-select">Update Status</Label>
              <Select value={job.status} onValueChange={handleStatusChange}>
                <SelectTrigger id="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editorStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <status.icon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-notes">Notes (optional)</Label>
              <Textarea
                id="status-notes"
                placeholder="Add notes about the status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}