import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Camera, CheckCircle, DollarSign, Plus } from "lucide-react";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";

function EditorDashboardContent() {
  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

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

  const { data: myJobCards, isLoading } = useQuery({
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
      <Layout title="Editor Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editor Dashboard">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editor Dashboard</h1>
            <p className="text-gray-600">Manage your assigned editing jobs</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            View All Jobs
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Assigned</p>
                  <p className="text-2xl font-bold">
                    {myJobCards?.filter((j: any) => j.status === "in_progress").length || 0}
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
                    {myJobCards?.filter((j: any) => j.status === "editing").length || 0}
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
                    {myJobCards?.filter((j: any) => j.status === "ready_for_qc").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-emerald-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Value</p>
                  <p className="text-2xl font-bold">
                    ${myJobCards?.reduce((sum: number, job: any) => sum + (job.estimatedCost || 0), 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Your Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {myJobCards && myJobCards.length > 0 ? (
              <div className="space-y-4">
                {myJobCards.map((job: any) => (
                  <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{job.client?.name || "Unknown Client"}</h3>
                        <p className="text-sm text-gray-600">{job.propertyAddress || "No address provided"}</p>
                      </div>
                      <Badge 
                        variant={job.status === "in_progress" ? "default" : 
                                job.status === "editing" ? "secondary" : 
                                job.status === "ready_for_qc" ? "destructive" : "outline"}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Job ID: {job.jobId || "Not assigned"}
                      </div>
                      <div className="text-sm font-medium">
                        ${job.estimatedCost || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Jobs Assigned</h3>
                <p className="text-gray-600">You don't have any jobs assigned to you yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default function EditorDashboard() {
  return <EditorDashboardContent />;
}