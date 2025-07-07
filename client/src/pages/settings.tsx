import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Shield, Bell, Palette } from "lucide-react";
import LoadingSpinner from "@/components/shared/loading-spinner";

export default function Settings() {
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
        <TopBar title="Settings" />
        <main className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
            <p className="text-slate-600">Manage your account and application preferences</p>
          </div>

          {/* Settings Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-brand-blue" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Update your personal information and preferences
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Profile
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Change Password
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Update Contact Info
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-brand-blue" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Manage your account security and access permissions
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Security Settings
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Active Sessions
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Login History
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-brand-blue" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Configure email and in-app notification preferences
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Email Notifications
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Push Notifications
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Notification Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-brand-blue" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Customize the look and feel of your application
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Theme Settings
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Language Preferences
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Layout Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className="mt-6 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                These actions cannot be undone. Please proceed with caution.
              </p>
              <div className="space-y-2">
                <Button variant="destructive" size="sm">
                  Reset All Settings
                </Button>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
