import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Bookings from "@/pages/bookings";
import Jobs from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import Production from "@/pages/production";
import UploadToEditor from "@/pages/upload-to-editor";
import EditorDashboard from "@/pages/editor-dashboard";
import EditorPortal from "@/pages/editor-portal";
import QaReview from "@/pages/qa-review";
import Calendar from "@/pages/calendar";
import Delivery from "@/pages/delivery";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : user?.role === 'editor' ? (
        // Editor-only routes
        <>
          <Route path="/" component={EditorPortal} />
          <Route path="/editor-portal" component={EditorPortal} />
          <Route component={() => <EditorPortal />} />
        </>
      ) : (
        // Admin/Licensee/Photographer routes
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/clients" component={Clients} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/jobs/:id" component={JobDetailPage} />
          <Route path="/production" component={Production} />
          <Route path="/upload-to-editor" component={UploadToEditor} />
          <Route path="/editor" component={EditorDashboard} />
          <Route path="/qa-review" component={QaReview} />
          <Route path="/delivery" component={Delivery} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
