import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
  showMessage?: boolean;
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = "/", 
  showMessage = true 
}: RoleProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || error) {
    window.location.href = "/api/login";
    return null;
  }

  const userRole = user.role || "licensee";
  
  if (!allowedRoles.includes(userRole)) {
    if (showMessage) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. This section is restricted to{' '}
              {allowedRoles.length === 1 
                ? `${allowedRoles[0]} users`
                : allowedRoles.slice(0, -1).join(', ') + ` and ${allowedRoles.slice(-1)[0]} users`
              }.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Your current role: <span className="font-medium">{userRole}</span></p>
              <Button 
                onClick={() => window.location.href = redirectTo}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    } else {
      window.location.href = redirectTo;
      return null;
    }
  }

  return <>{children}</>;
}