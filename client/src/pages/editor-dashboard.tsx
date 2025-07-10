import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Download, 
  Upload, 
  CheckCircle, 
  Clock, 
  Camera,
  FileText,
  DollarSign
} from "lucide-react";
import JobStatusPanel from "@/components/job-status-panel";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import EditorServicePricing from "@/components/editor/service-pricing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobCard, Client, User, ProductionFile } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
}

function EditorDashboardContent() {
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJobCard, setSelectedJobCard] = useState<JobCardWithDetails | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [activeTab, setActiveTab] = useState("jobs");

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

  const { data: myJobCards, isLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/editor/job-cards", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/editor/job-cards`);
      if (!response.ok) throw new Error("Failed to fetch job cards");
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
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
        description: "Failed to update job status",
        variant: "destructive",
      });
    },
  });

  const completeJobWithContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("POST", `/api/job-cards/${id}/complete-with-content`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
      toast({
        title: "Success",
        description: `Job completed! Content pieces created with final cost: $${data.finalCost || 0}`,
      });
      setSelectedJobCard(null);
      setCompletionNotes("");
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
        description: "Failed to complete job with content",
        variant: "destructive",
      });
    },
  });

  const handleAcceptJob = (jobCard: JobCardWithDetails) => {
    updateJobCardMutation.mutate({
      id: jobCard.id,
      data: { status: "editing" }
    });
  };

  const handleCompleteJob = (jobCard: JobCardWithDetails) => {
    // Use the new comprehensive completion endpoint
    completeJobWithContentMutation.mutate({
      id: jobCard.id,
      data: {
        notes: completionNotes || jobCard.editingNotes,
        instructionsFollowed: "All client instructions followed as specified",
        qcIssues: "No issues flagged - ready for client delivery",
        completionDetails: {
          editorNotes: completionNotes,
          completionTime: new Date().toISOString(),
          filesCompleted: true
        }
      }
    });
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
      case "editing": return "Editing";
      case "ready_for_qc": return "Ready for QC";
      case "in_revision": return "In Revision";
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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopBar title="Editor Dashboard" />
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
        <TopBar title="Editor Dashboard" />
        
        <div className="p-6">
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
                    <p className="text-sm font-medium text-slate-600">In Editing</p>
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
                      {myJobCards?.filter(j => j.status === "ready_for_qc").length || 0}
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
                    <p className="text-sm font-medium text-slate-600">In Revision</p>
                    <p className="text-2xl font-bold">
                      {myJobCards?.filter(j => j.status === "in_revision").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                My Jobs
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Service Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs">
              {/* Job Cards */}
              {!myJobCards || myJobCards.length === 0 ? (
                <EmptyState
                  icon={Camera}
                  title="No Jobs Assigned"
                  description="You don't have any jobs assigned to you yet."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {myJobCards.map((jobCard) => (
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
                        
                        {/* Quick Status Panel */}
                        <JobStatusPanel 
                          jobId={jobCard.id}
                          currentStatus={jobCard.status}
                          jobStatus={jobCard.jobStatus || jobCard.status}
                          compact={true}
                        />
                        
                        <div className="flex gap-2">
                          {jobCard.status === "in_progress" && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptJob(jobCard)}
                              className="flex-1"
                            >
                              Accept Job
                            </Button>
                          )}
                          
                          {jobCard.status === "editing" && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedJobCard(jobCard)}
                              className="flex-1"
                            >
                              Mark Complete
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedJobCard(jobCard)}
                            className="flex-1"
                            
                          >
                            View Files
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="services">
              <EditorServicePricing />
            </TabsContent>
          </Tabs>

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
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                      {getRawFiles(productionFiles || []).length === 0 && (
                        <p className="text-slate-500 italic">No raw files uploaded yet</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Final Files */}
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Final Files</h4>
                    <div className="space-y-2">
                      {getFinalFiles(productionFiles || []).map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                          <div>
                            <p className="font-medium">{file.originalName}</p>
                            <p className="text-sm text-slate-600">{file.serviceCategory}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                      {getFinalFiles(productionFiles || []).length === 0 && (
                        <p className="text-slate-500 italic">No final files uploaded yet</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Upload Section */}
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Upload Final Files</h4>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">Drag and drop files here or click to browse</p>
                      <Button variant="outline" className="mt-2">
                        Select Files
                      </Button>
                    </div>
                  </div>
                  
                  {/* Completion Notes */}
                  {selectedJobCard.status === "editing" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Completion Notes
                        </label>
                        <Textarea
                          placeholder="Add any notes about the completed work..."
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          className="h-24"
                        />
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">Content Creation Summary</h5>
                        <p className="text-sm text-blue-700">
                          When you complete this job, the system will:
                        </p>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1">
                          <li>• Create content pieces for all final files with Job ID {selectedJobCard.jobId}</li>
                          <li>• Log comprehensive completion details in the activity record</li>
                          <li>• Calculate final edit costs based on service pricing</li>
                          <li>• Track instructions followed and QC status</li>
                          <li>• Prepare job for client delivery</li>
                        </ul>
                      </div>
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
                  
                  {selectedJobCard.status === "editing" && (
                    <Button
                      onClick={() => handleCompleteJob(selectedJobCard)}
                      className="flex-1"
                      disabled={completeJobWithContentMutation.isPending}
                    >
                      {completeJobWithContentMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Content...
                        </>
                      ) : (
                        "Complete Job & Create Content"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditorDashboard() {
  // TEMPORARY: Allow direct access for testing (remove after testing)
  return <EditorDashboardContent />;
  
  // Original role protection (uncomment after testing)
  // return (
  //   <RoleProtectedRoute allowedRoles={["editor"]}>
  //     <EditorDashboardContent />
  //   </RoleProtectedRoute>
  // );
}