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
import { 
  CheckCircle, 
  Clock, 
  Camera,
  FileText,
  DollarSign
} from "lucide-react";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import EditorServicePricing from "@/components/editor/service-pricing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EditorJobCard from "@/components/editor/EditorJobCard";
import type { JobCard, Client, User } from "@shared/schema";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
  booking?: {
    id: number;
    propertyAddress: string;
    scheduledDate: string;
    scheduledTime: string;
    price: string;
  };
}

function EditorDashboardContent() {
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
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
              {!myJobCards || myJobCards.length === 0 ? (
                <EmptyState
                  icon={Camera}
                  title="No Jobs Assigned"
                  description="You don't have any jobs assigned to you yet."
                />
              ) : (
                <div className="space-y-6">
                  {myJobCards.map((jobCard) => (
                    <EditorJobCard
                      key={jobCard.id}
                      job={jobCard}
                      onStatusChange={(jobId, newStatus) => {
                        queryClient.invalidateQueries({ queryKey: ["/api/editor/job-cards", user?.id] });
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="services">
              <EditorServicePricing />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function EditorDashboard() {
  return (
    <RoleProtectedRoute allowedRoles={["editor", "admin"]}>
      <EditorDashboardContent />
    </RoleProtectedRoute>
  );
}