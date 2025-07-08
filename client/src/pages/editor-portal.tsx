import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  Upload, 
  CheckCircle, 
  Clock, 
  Camera,
  FileText,
  AlertCircle,
  LogOut
} from "lucide-react";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { JobCard, Client, User, ProductionFile } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
}

export default function EditorPortal() {
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJobCard, setSelectedJobCard] = useState<JobCardWithDetails | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    
    // Redirect non-editors to main app
    if (user && user.role !== 'editor') {
      window.location.href = "/";
      return;
    }
  }, [isAuthenticated, authLoading, user]);

  const { data: myJobCards, isLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/editor/job-cards"],
    enabled: isAuthenticated && user?.role === 'editor',
  });

  const { data: productionFiles } = useQuery<ProductionFile[]>({
    queryKey: ["/api/job-cards", selectedJobCard?.id, "files"],
    queryFn: async () => {
      if (!selectedJobCard?.id) return [];
      const response = await fetch(`/api/job-cards/${selectedJobCard.id}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: !!selectedJobCard?.id,
  });

  const updateJobCardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/job-cards/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
      toast({
        title: "Success",
        description: "Job status updated successfully",
      });
      setSelectedJobCard(null);
      setCompletionNotes("");
      setUploadFiles([]);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async ({ jobCardId, files }: { jobCardId: number; files: File[] }) => {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('mediaType', 'final');
      formData.append('serviceCategory', 'edited');
      formData.append('instructions', completionNotes);
      
      const response = await fetch(`/api/job-cards/${jobCardId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload files');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards", selectedJobCard?.id, "files"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const handleStartJob = (jobCard: JobCardWithDetails) => {
    updateJobCardMutation.mutate({
      id: jobCard.id,
      data: { status: "editing" }
    });
  };

  const handleCompleteJob = (jobCard: JobCardWithDetails) => {
    if (uploadFiles.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload final files before completing the job",
        variant: "destructive",
      });
      return;
    }

    // First upload files, then update status
    uploadFilesMutation.mutate(
      { jobCardId: jobCard.id, files: uploadFiles },
      {
        onSuccess: () => {
          updateJobCardMutation.mutate({
            id: jobCard.id,
            data: { 
              status: "ready_for_qc",
              editingNotes: completionNotes || jobCard.editingNotes,
            }
          });
        }
      }
    );
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-blue-500";
      case "editing": return "bg-yellow-500";
      case "ready_for_qc": return "bg-green-500";
      case "in_revision": return "bg-orange-500";
      case "delivered": return "bg-emerald-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress": return "Assigned";
      case "editing": return "In Progress";
      case "ready_for_qc": return "Ready for QC";
      case "in_revision": return "Needs Revision";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  const getRawFiles = (files: ProductionFile[]) => 
    files?.filter(file => file.mediaType === "raw") || [];

  const getFinalFiles = (files: ProductionFile[]) => 
    files?.filter(file => file.mediaType === "final") || [];

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== 'editor') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-4">This portal is only accessible to editors.</p>
          <Button onClick={() => window.location.href = "/"}>
            Go to Main App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Editor Dashboard</h1>
            <p className="text-slate-600">Welcome back, {user.firstName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Assigned</p>
                  <p className="text-2xl font-bold">
                    {myJobCards?.filter(j => j.status === "in_progress").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Camera className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">In Progress</p>
                  <p className="text-2xl font-bold">
                    {myJobCards?.filter(j => j.status === "editing").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold">
                    {myJobCards?.filter(j => j.status === "ready_for_qa").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Revisions</p>
                  <p className="text-2xl font-bold">
                    {myJobCards?.filter(j => j.status === "in_revision").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myJobCards?.map((jobCard) => (
            <Card key={jobCard.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {jobCard.jobId}
                  </CardTitle>
                  <Badge 
                    className={`text-white ${getStatusColor(jobCard.status || "unassigned")}`}
                  >
                    {getStatusLabel(jobCard.status || "unassigned")}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-slate-900">{jobCard.client.name}</p>
                  <p className="text-sm text-slate-600">{jobCard.client.email}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-700">Services:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(jobCard.requestedServices as string[])?.map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {jobCard.editingNotes && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Notes:</p>
                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      {jobCard.editingNotes}
                    </p>
                  </div>
                )}

                {jobCard.assignedAt && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Assigned:</p>
                    <p className="text-sm text-slate-600">
                      {new Date(jobCard.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {jobCard.status === "in_progress" && (
                    <Button
                      size="sm"
                      onClick={() => handleStartJob(jobCard)}
                      className="flex-1"
                    >
                      Start Editing
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedJobCard(jobCard)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Job Details Modal */}
        {selectedJobCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Job Details - {selectedJobCard.jobId}
              </h3>
              
              <div className="space-y-6">
                {/* Raw Files */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Raw Files</h4>
                  <div className="space-y-2">
                    {getRawFiles(productionFiles || []).map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium">{file.originalName}</p>
                          <p className="text-sm text-slate-600">{file.serviceCategory}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/api/files/${file.fileName}`, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                    {getRawFiles(productionFiles || []).length === 0 && (
                      <p className="text-slate-500 italic">No raw files available</p>
                    )}
                  </div>
                </div>
                
                {/* Upload Final Files */}
                {(selectedJobCard.status === "editing" || selectedJobCard.status === "in_progress") && (
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Upload Final Files</h4>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 mb-2">Select final edited files</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                        className="hidden"
                        id="final-file-upload"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('final-file-upload')?.click()}
                      >
                        Select Files
                      </Button>
                      {uploadFiles.length > 0 && (
                        <div className="mt-3 text-sm text-slate-600">
                          {uploadFiles.length} file(s) selected
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Completion Notes */}
                {(selectedJobCard.status === "editing" || selectedJobCard.status === "in_progress") && (
                  <div>
                    <Label htmlFor="completion-notes">Completion Notes</Label>
                    <Textarea
                      id="completion-notes"
                      placeholder="Add any notes about the completed work..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      className="h-24 mt-2"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedJobCard(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                
                {(selectedJobCard.status === "editing" || selectedJobCard.status === "in_progress") && (
                  <Button
                    onClick={() => handleCompleteJob(selectedJobCard)}
                    className="flex-1"
                    disabled={updateJobCardMutation.isPending || uploadFilesMutation.isPending}
                  >
                    Complete Job
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}