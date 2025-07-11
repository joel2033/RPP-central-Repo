import React, { memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Sidebar from './sidebar';
import TopBar from './topbar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  requireAuth?: boolean;
}

export const Layout = memo(({ children, title, requireAuth = true }: LayoutProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Handle authentication redirect
  React.useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, requireAuth, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title={title} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';