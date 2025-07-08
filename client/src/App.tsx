import React, { Suspense, lazy } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { queryClient } from '@/lib/queryClient';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('@/views/Dashboard/Dashboard'));
const Clients = lazy(() => import('@/views/Clients/Clients'));
const Jobs = lazy(() => import('@/pages/jobs'));
const Calendar = lazy(() => import('@/pages/calendar'));
const Bookings = lazy(() => import('@/pages/bookings'));
const Production = lazy(() => import('@/pages/production'));
const UploadToEditor = lazy(() => import('@/pages/upload-to-editor'));
const EditorDashboard = lazy(() => import('@/pages/editor-dashboard'));
const JobDetail = lazy(() => import('@/pages/job-detail'));
const DeliveryPage = lazy(() => import('@/pages/delivery-page'));
const Products = lazy(() => import('@/pages/products'));
const OrderStatus = lazy(() => import('@/views/Production/OrderStatus'));
const Profile = lazy(() => import('@/pages/profile'));
const BusinessSettings = lazy(() => import('@/pages/business-settings'));
const NotFound = lazy(() => import('@/pages/not-found'));

const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

const AppRoutes = React.memo(() => (
  <Switch>
    <Route path="/" component={Dashboard} />
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/clients" component={Clients} />
    <Route path="/jobs" component={Jobs} />
    <Route path="/jobs/:id" component={JobDetail} />
    <Route path="/calendar" component={Calendar} />
    <Route path="/bookings" component={Bookings} />
    <Route path="/production" component={Production} />
    <Route path="/production/upload" component={UploadToEditor} />
    <Route path="/production/status" component={OrderStatus} />
    <Route path="/upload-to-editor" component={UploadToEditor} />
    <Route path="/editor-dashboard" component={EditorDashboard} />
    <Route path="/products" component={Products} />
    <Route path="/profile" component={Profile} />
    <Route path="/business-settings" component={BusinessSettings} />
    <Route path="/delivery/:jobId" component={DeliveryPage} />
    <Route component={NotFound} />
  </Switch>
));

AppRoutes.displayName = 'AppRoutes';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50">
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </div>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;