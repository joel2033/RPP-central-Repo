import React, { memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { Layout } from "@/components/layout/Layout";
import StatsCards from "@/components/dashboard/stats-cards";
import RecentBookings from "@/components/dashboard/recent-bookings";
import QuickActions from "@/components/dashboard/quick-actions";
import UpcomingJobs from "@/components/dashboard/upcoming-jobs";

const Dashboard = memo(() => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        <AsyncBoundary>
          <StatsCards />
        </AsyncBoundary>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AsyncBoundary>
              <RecentBookings />
            </AsyncBoundary>
          </div>
          
          <div className="space-y-6">
            <AsyncBoundary>
              <QuickActions />
            </AsyncBoundary>
            
            <AsyncBoundary>
              <UpcomingJobs />
            </AsyncBoundary>
          </div>
        </div>
      </div>
    </Layout>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;