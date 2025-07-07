import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Users, Calendar, BarChart3, FileText, Download } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-brand-blue mr-3" />
              <h1 className="text-2xl font-bold text-slate-900">RealEstate Media Pro</h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-brand-blue hover:bg-blue-700"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-brand-blue to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Comprehensive Real Estate Media Management
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Streamline your real estate media franchise with our all-in-one platform for client management, 
            booking, job tracking, and delivery.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => window.location.href = '/api/login'}
            className="bg-white text-brand-blue hover:bg-slate-100"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you need to manage your franchise
            </h3>
            <p className="text-xl text-slate-600">
              Built specifically for real estate media professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="h-full">
              <CardHeader>
                <Users className="h-12 w-12 text-brand-blue mb-4" />
                <CardTitle>Client CRM</CardTitle>
                <CardDescription>
                  Manage all your real estate agency clients, contacts, and communication history in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Contact management</li>
                  <li>• Communication tracking</li>
                  <li>• Revenue analytics</li>
                  <li>• Booking history</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <Calendar className="h-12 w-12 text-brand-blue mb-4" />
                <CardTitle>Booking System</CardTitle>
                <CardDescription>
                  Easy booking system for photography, drone, floor plans, and video services.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Service selection</li>
                  <li>• Calendar scheduling</li>
                  <li>• Photographer assignment</li>
                  <li>• Status tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <Camera className="h-12 w-12 text-brand-blue mb-4" />
                <CardTitle>Job Management</CardTitle>
                <CardDescription>
                  Track all shoots from booking to delivery with comprehensive job management tools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Job dashboard</li>
                  <li>• Media uploads</li>
                  <li>• QA checklists</li>
                  <li>• Progress tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <Download className="h-12 w-12 text-brand-blue mb-4" />
                <CardTitle>Delivery Portal</CardTitle>
                <CardDescription>
                  Branded delivery portal for clients to download their media files and provide feedback.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Secure file sharing</li>
                  <li>• Branded experience</li>
                  <li>• Download tracking</li>
                  <li>• Feedback collection</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-brand-blue mb-4" />
                <CardTitle>Analytics & Reports</CardTitle>
                <CardDescription>
                  Comprehensive reporting and analytics to track your business performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• Revenue tracking</li>
                  <li>• Service analytics</li>
                  <li>• Client metrics</li>
                  <li>• Export capabilities</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <FileText className="h-12 w-12 text-brand-blue mb-4" />
                <CardTitle>Multi-User Access</CardTitle>
                <CardDescription>
                  Role-based access control for admins, photographers, VAs, and licensees.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>• User roles & permissions</li>
                  <li>• Data isolation</li>
                  <li>• Secure authentication</li>
                  <li>• Team collaboration</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-6">
            Ready to streamline your real estate media business?
          </h3>
          <p className="text-xl text-slate-600 mb-8">
            Join dozens of franchisees who trust RealEstate Media Pro to manage their operations.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-brand-blue hover:bg-blue-700"
          >
            Sign In to Get Started
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Camera className="h-6 w-6 text-brand-blue mr-2" />
            <span className="text-slate-600">© 2024 RealEstate Media Pro. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
