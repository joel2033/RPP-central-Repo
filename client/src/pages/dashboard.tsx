import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import StatsCards from "@/components/dashboard/stats-cards";
import RecentBookings from "@/components/dashboard/recent-bookings";
import QuickActions from "@/components/dashboard/quick-actions";
import ServicesOverview from "@/components/dashboard/services-overview";
import UpcomingJobs from "@/components/dashboard/upcoming-jobs";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Authentication disabled - no checks needed

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title="Dashboard" />
        <main className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2">
                <RecentBookings />
              </div>
              <div>
                <QuickActions />
              </div>
            </div>
            <ServicesOverview />
            <UpcomingJobs />
          </div>
        </main>
      </div>
    </div>
  );
}
