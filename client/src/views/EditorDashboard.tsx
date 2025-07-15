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
import { 
  Download, 
  Upload, 
  CheckCircle, 
  Clock, 
  Camera,
  FileText,
  DollarSign,
  AlertCircle,
  Package
} from "lucide-react";
import JobStatusPanel from "@/components/job-status-panel";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobCard, Client, User, ProductionFile } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
  files?: ProductionFile[];
}

interface EditorDashboardProps {
  className?: string;
}

export default function EditorDashboard({ className }: EditorDashboardProps) {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

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

  // Fetch editor's assigned jobs
  const { data: myJobCards, isLoading, error } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/editor/job-cards"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/editor/job-cards');
      console.log('Editor Dashboard - Current user:', user);
      console.log('Editor Dashboard - Fetched jobs:', response);
      return response;
    },
    enabled: isAuthenticated && !!user,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return false;
      }
      return failureCount < 3;
    },
  });

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("PUT", `/api/job-cards/${jobId}`, {
        status: "in_progress",
        editorId: user?.id,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Job accepted",
        description: `Job #${data.jobId} has been accepted and is now in progress`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: "Failed to accept job. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Decline job mutation
  const declineJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("PUT", `/api/job-cards/${jobId}`, {
        status: "unassigned",
        editorId: null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Job declined",
        description: "Job has been declined and returned to the queue",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: "Failed to decline job. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Start editing mutation
  const startEditingMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("PUT", `/api/job-cards/${jobId}`, {
        status: "editing",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Editing started",
        description: `Job #${data.jobId} is now in editing mode`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: "Failed to start editing. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("POST", `/api/job-cards/${jobId}/complete-with-content`, {
        notes: "Job completed by editor",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Job completed",
        description: `Job #${data.jobId} has been completed and is ready for QC`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: "Failed to complete job. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: Camera },
      editing: { label: "Editing", color: "bg-purple-100 text-purple-800", icon: FileText },
      ready_for_qc: { label: "Ready for QC", color: "bg-green-100 text-green-800", icon: CheckCircle },
      delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: Package },
      in_revision: { label: "In Revision", color: "bg-red-100 text-red-800", icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getJobsByStatus = (status: string) => {
    if (!myJobCards) return [];
    return myJobCards.filter(job => job.status === status);
  };

  const renderJobCard = (job: JobCardWithDetails) => {
    const canAccept = job.status === "pending";
    const canStartEditing = job.status === "in_progress";
    const canComplete = job.status === "editing";

    return (
      <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">
              Job #{job.jobId || "No ID"}
            </h3>
            <p className="text-sm text-slate-600">
              {job.client?.name} - {job.booking?.propertyAddress}
            </p>
          </div>
          {getStatusBadge(job.status)}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Camera className="h-4 w-4" />
            Services: {job.requestedServices?.join(", ") || "None"}
          </div>
          {job.editingNotes && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <FileText className="h-4 w-4 mt-0.5" />
              <span>{job.editingNotes}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {canAccept && (
            <>
              <Button
                size="sm"
                onClick={() => acceptJobMutation.mutate(job.id)}
                disabled={acceptJobMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineJobMutation.mutate(job.id)}
                disabled={declineJobMutation.isPending}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Decline
              </Button>
            </>
          )}
          
          {canStartEditing && (
            <Button
              size="sm"
              onClick={() => startEditingMutation.mutate(job.id)}
              disabled={startEditingMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="h-4 w-4 mr-1" />
              Start Editing
            </Button>
          )}
          
          {canComplete && (
            <Button
              size="sm"
              onClick={() => completeJobMutation.mutate(job.id)}
              disabled={completeJobMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-red-600">Error loading jobs</h3>
          <p className="text-sm text-slate-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const pendingJobs = getJobsByStatus("pending");
  const inProgressJobs = getJobsByStatus("in_progress");
  const editingJobs = getJobsByStatus("editing");
  const completedJobs = getJobsByStatus("ready_for_qc");

  return (
    <div className={`p-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold">{pendingJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-600">In Progress</p>
                <p className="text-2xl font-bold">{inProgressJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-600">Editing</p>
                <p className="text-2xl font-bold">{editingJobs.length}</p>
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
                <p className="text-2xl font-bold">{completedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({pendingJobs.length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({inProgressJobs.length})</TabsTrigger>
          <TabsTrigger value="editing">Editing ({editingJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingJobs.length > 0 ? (
            <div className="grid gap-4">
              {pendingJobs.map(renderJobCard)}
            </div>
          ) : (
            <EmptyState
              title="No pending jobs"
              description="You don't have any pending jobs at the moment"
              icon={Clock}
            />
          )}
        </TabsContent>
        
        <TabsContent value="in_progress" className="space-y-4">
          {inProgressJobs.length > 0 ? (
            <div className="grid gap-4">
              {inProgressJobs.map(renderJobCard)}
            </div>
          ) : (
            <EmptyState
              title="No jobs in progress"
              description="You don't have any jobs in progress at the moment"
              icon={Camera}
            />
          )}
        </TabsContent>
        
        <TabsContent value="editing" className="space-y-4">
          {editingJobs.length > 0 ? (
            <div className="grid gap-4">
              {editingJobs.map(renderJobCard)}
            </div>
          ) : (
            <EmptyState
              title="No jobs in editing"
              description="You don't have any jobs in editing at the moment"
              icon={FileText}
            />
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedJobs.length > 0 ? (
            <div className="grid gap-4">
              {completedJobs.map(renderJobCard)}
            </div>
          ) : (
            <EmptyState
              title="No completed jobs"
              description="You haven't completed any jobs yet"
              icon={CheckCircle}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}