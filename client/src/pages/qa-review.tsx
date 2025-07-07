import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye,
  FileText,
  AlertCircle
} from "lucide-react";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { JobCard, Client, User, ProductionFile } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
  editor: User | null;
}

export default function PreDeliveryCheck() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJobCard, setSelectedJobCard] = useState<JobCardWithDetails | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");

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
    
    // Check if user has permission (only admins and VAs)
    if (isAuthenticated && user && !['admin', 'va'].includes(user.role)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access Pre-Delivery Check.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, authLoading, user, toast]);

  const { data: qaJobCards, isLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/job-cards", "qa"],
    queryFn: async () => {
      const response = await fetch("/api/job-cards?status=ready_for_qa");
      if (!response.ok) throw new Error("Failed to fetch Pre-Delivery Check job cards");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: revisionJobCards } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/job-cards", "revision"],
    queryFn: async () => {
      const response = await fetch("/api/job-cards?status=in_revision");
      if (!response.ok) throw new Error("Failed to fetch revision job cards");
      return response.json();
    },
    enabled: isAuthenticated,
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
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({
        title: "Success",
        description: "Pre-Delivery Check completed successfully",
      });
      setSelectedJobCard(null);
      setRevisionNotes("");
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
        description: "Failed to complete Pre-Delivery Check",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (jobCard: JobCardWithDetails) => {
    updateJobCardMutation.mutate({
      id: jobCard.id,
      data: { status: "delivered" }
    });
  };

  const handleRequestRevision = (jobCard: JobCardWithDetails) => {
    if (!revisionNotes.trim()) {
      toast({
        title: "Revision Notes Required",
        description: "Please provide revision notes before requesting changes",
        variant: "destructive",
      });
      return;
    }

    updateJobCardMutation.mutate({
      id: jobCard.id,
      data: { 
        status: "in_revision",
        revisionNotes: revisionNotes
      }
    });
  };

  const getFinalFiles = (files: ProductionFile[]) => 
    files?.filter(file => file.mediaType === "final") || [];

  // Show unauthorized message if user doesn't have permission
  if (isAuthenticated && user && !['admin', 'va'].includes(user.role)) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopBar title="Access Denied" />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access Pre-Delivery Check.</p>
              <p className="text-sm text-gray-500 mt-2">Only Admins and VAs can access this section.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopBar title="Pre-Delivery Check Queue" />
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  const allJobCards = [...(qaJobCards || []), ...(revisionJobCards || [])];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title="Pre-Delivery Check Queue" />
        
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">Ready for Pre-Delivery Check</p>
                    <p className="text-2xl font-bold">
                      {qaJobCards?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-slate-600">In Revision</p>
                    <p className="text-2xl font-bold">
                      {revisionJobCards?.length || 0}
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
                    <p className="text-sm font-medium text-slate-600">Total Queue</p>
                    <p className="text-2xl font-bold">
                      {allJobCards.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job Cards */}
          {allJobCards.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Jobs in Pre-Delivery Check Queue"
              description="There are no jobs currently awaiting Pre-Delivery Check."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allJobCards.map((jobCard) => (
                <Card key={jobCard.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">
                        {jobCard.jobId}
                      </CardTitle>
                      <Badge 
                        className={`text-white ${
                          jobCard.status === "ready_for_qa" ? "bg-green-500" : "bg-orange-500"
                        }`}
                      >
                        {jobCard.status === "ready_for_qa" ? "Ready for Pre-Delivery Check" : "In Revision"}
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
                    
                    {jobCard.editor && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Editor:</p>
                        <p className="text-sm text-slate-600">
                          {jobCard.editor.firstName} {jobCard.editor.lastName}
                        </p>
                      </div>
                    )}
                    
                    {jobCard.revisionNotes && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Revision Notes:</p>
                        <p className="text-sm text-slate-600 bg-orange-50 p-2 rounded">
                          {jobCard.revisionNotes}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedJobCard(jobCard)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Review Modal */}
          {selectedJobCard && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  Pre-Delivery Check - {selectedJobCard.jobId}
                </h3>
                
                <div className="space-y-6">
                  {/* Job Info */}
                  <div className="bg-slate-50 p-4 rounded">
                    <h4 className="font-medium text-slate-700 mb-2">Job Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Client:</p>
                        <p>{selectedJobCard.client.name}</p>
                      </div>
                      <div>
                        <p className="font-medium">Editor:</p>
                        <p>{selectedJobCard.editor?.firstName} {selectedJobCard.editor?.lastName}</p>
                      </div>
                      <div>
                        <p className="font-medium">Services:</p>
                        <p>{(selectedJobCard.requestedServices as string[])?.join(", ")}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status:</p>
                        <Badge className={`${
                          selectedJobCard.status === "ready_for_qa" ? "bg-green-500" : "bg-orange-500"
                        } text-white`}>
                          {selectedJobCard.status === "ready_for_qa" ? "Ready for Pre-Delivery Check" : "In Revision"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Final Files */}
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">Final Files for Review</h4>
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
                        <p className="text-slate-500 italic">No final files available for review</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Previous Notes */}
                  {selectedJobCard.editingNotes && (
                    <div>
                      <h4 className="font-medium text-slate-700 mb-2">Editor Notes</h4>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm">{selectedJobCard.editingNotes}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Revision Notes Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Revision Notes (if requesting changes)
                    </label>
                    <Textarea
                      placeholder="Describe what needs to be revised..."
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      className="h-24"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedJobCard(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleRequestRevision(selectedJobCard)}
                    disabled={updateJobCardMutation.isPending}
                    className="flex-1 text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                  
                  <Button
                    onClick={() => handleApprove(selectedJobCard)}
                    disabled={updateJobCardMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Deliver
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}