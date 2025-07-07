import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, Users, Calendar } from "lucide-react";
import LoadingSpinner from "@/components/shared/loading-spinner";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title="Reports" />
        <main className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
              <p className="text-slate-600">Track your business performance and generate reports</p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export All Reports
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">$0</div>
                <p className="text-xs text-emerald-600">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  0% vs last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">0</div>
                <p className="text-xs text-slate-500">Jobs completed this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">0</div>
                <p className="text-xs text-slate-500">Clients with recent bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Avg. Job Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">$0</div>
                <p className="text-xs text-slate-500">Average revenue per job</p>
              </CardContent>
            </Card>
          </div>

          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-brand-blue" />
                  Revenue Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Track your revenue over time and identify trends
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Monthly Revenue Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Quarterly Summary
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Annual Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-brand-blue" />
                  Client Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Analyze client behavior and booking patterns
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Client Activity Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Top Clients Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Client Retention Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-brand-blue" />
                  Service Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Monitor service performance and popularity
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Service Performance
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Popular Services
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Service Pricing Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
