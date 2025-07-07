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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Camera, FileText, Upload, Send } from "lucide-react";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { JobCard, Client, User, ProductionFile } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
  editor: User | null;
}

export default function Production() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedJobCard, setSelectedJobCard] = useState<JobCardWithDetails | null>(null);
  const [editorNotes, setEditorNotes] = useState("");

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

  const { data: jobCards, isLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/job-cards", statusFilter],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== "all" ? `/api/job-cards?status=${statusFilter}` : "/api/job-cards";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch job cards");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: editors } = useQuery<User[]>({
    queryKey: ["/api/editors"],
    enabled: isAuthenticated,
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
        description: "Job card updated successfully",
      });
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
        description: "Failed to update job card",
        variant: "destructive",
      });
    },
  });

  const filteredJobCards = jobCards?.filter(jobCard =>
    jobCard.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jobCard.jobId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAssignEditor = (jobCard: JobCardWithDetails, editorId: string) => {
    updateJobCardMutation.mutate({
      id: jobCard.id,
      data: {
        editorId: editorId === "none" ? null : editorId,
        status: editorId === "none" ? "unassigned" : "in_progress",
        editingNotes: editorNotes || jobCard.editingNotes,
      }
    });
    setSelectedJobCard(null);
    setEditorNotes("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unassigned": return "bg-gray-500";
      case "in_progress": return "bg-blue-500";
      case "editing": return "bg-yellow-500";
      case "ready_for_qa": return "bg-green-500";
      case "in_revision": return "bg-orange-500";
      case "delivered": return "bg-emerald-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "unassigned": return "Unassigned";
      case "in_progress": return "In Progress";
      case "editing": return "Editing";
      case "ready_for_qa": return "Ready for QA";
      case "in_revision": return "In Revision";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopBar title="Production Workflow" />
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
        <TopBar title="Production Workflow" />
        
        <div className="p-6">
          {/* Header and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search job cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="editing">Editing</SelectItem>
                <SelectItem value="ready_for_qa">Ready for Pre-Delivery Check</SelectItem>
                <SelectItem value="in_revision">In Revision</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Cards Grid */}
          {filteredJobCards.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No Job Cards Found"
              description="No job cards match your current filters."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobCards.map((jobCard) => (
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
                    
                    {jobCard.photographer && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Photographer:</p>
                        <p className="text-sm text-slate-600">
                          {jobCard.photographer.firstName} {jobCard.photographer.lastName}
                        </p>
                      </div>
                    )}
                    
                    {jobCard.editor && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Editor:</p>
                        <p className="text-sm text-slate-600">
                          {jobCard.editor.firstName} {jobCard.editor.lastName}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedJobCard(jobCard)}
                        className="flex-1"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Assign Editor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Assignment Modal */}
          {selectedJobCard && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  Assign Editor - {selectedJobCard.jobId}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Editor
                    </label>
                    <Select onValueChange={(value) => handleAssignEditor(selectedJobCard, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an editor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No editor assigned</SelectItem>
                        {editors?.map((editor) => (
                          <SelectItem key={editor.id} value={editor.id}>
                            {editor.firstName} {editor.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Editing Notes
                    </label>
                    <Textarea
                      placeholder="Enter editing instructions..."
                      value={editorNotes}
                      onChange={(e) => setEditorNotes(e.target.value)}
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
                    Cancel
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