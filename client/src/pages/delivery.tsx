import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  ExternalLink,
  Settings,
  Eye,
  Copy,
  FileText,
  Calendar,
  User,
  Download,
  MessageSquare,
  CheckCircle
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface JobCard {
  id: number;
  jobId: string;
  status: string;
  jobStatus: string;
  requestedServices: string[];
  client: {
    id: number;
    name: string;
    contactName: string;
  };
  booking?: {
    propertyAddress: string;
    scheduledDate: string;
  };
  deliverySettings?: {
    id: number;
    isPublic: boolean;
    enableComments: boolean;
    enableDownloads: boolean;
    deliveryUrl?: string;
  };
}

export default function DeliveryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/jobs"],
  });

  const handleCopyLink = (jobId: number, customUrl?: string) => {
    const baseUrl = window.location.origin;
    const deliveryLink = customUrl 
      ? `${baseUrl}/delivery/url/${customUrl}`
      : `${baseUrl}/delivery/${jobId}`;
    
    navigator.clipboard.writeText(deliveryLink);
    toast({
      title: "Link copied",
      description: "Delivery page link copied to clipboard",
    });
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.booking?.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "ready" && job.status === "ready_for_qa") ||
      (statusFilter === "delivered" && job.status === "delivered") ||
      (statusFilter === "revision" && job.status === "in_revision");
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready_for_qa": return "bg-yellow-100 text-yellow-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "in_revision": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ready_for_qa": return "Ready for Delivery";
      case "delivered": return "Delivered";
      case "in_revision": return "In Revision";
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading delivery pages...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <TopBar />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Delivery Pages</h1>
              <p className="text-slate-600">Manage client delivery pages and settings</p>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by job ID, client name, or property address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      onClick={() => setStatusFilter("all")}
                      size="sm"
                    >
                      All Jobs
                    </Button>
                    <Button
                      variant={statusFilter === "ready" ? "default" : "outline"}
                      onClick={() => setStatusFilter("ready")}
                      size="sm"
                    >
                      Ready for Delivery
                    </Button>
                    <Button
                      variant={statusFilter === "delivered" ? "default" : "outline"}
                      onClick={() => setStatusFilter("delivered")}
                      size="sm"
                    >
                      Delivered
                    </Button>
                    <Button
                      variant={statusFilter === "revision" ? "default" : "outline"}
                      onClick={() => setStatusFilter("revision")}
                      size="sm"
                    >
                      In Revision
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Jobs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{job.jobId}</h3>
                        <p className="text-sm text-gray-600">{job.client.name}</p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Property Details */}
                    {job.booking && (
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          {job.booking.propertyAddress}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(job.booking.scheduledDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {/* Services */}
                    <div className="flex flex-wrap gap-1">
                      {job.requestedServices.slice(0, 3).map((service) => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {job.requestedServices.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.requestedServices.length - 3} more
                        </Badge>
                      )}
                    </div>

                    {/* Delivery Settings Status */}
                    {job.deliverySettings ? (
                      <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">Delivery page configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-700">Delivery page not configured</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Link href={`/jobs/${job.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <FileText className="h-4 w-4 mr-2" />
                          View Job
                        </Button>
                      </Link>
                      
                      {job.deliverySettings ? (
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(job.id, job.deliverySettings?.deliveryUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = job.deliverySettings?.deliveryUrl 
                                ? `/delivery/url/${job.deliverySettings.deliveryUrl}`
                                : `/delivery/${job.id}`;
                              window.open(link, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="default" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Setup
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Quick Stats */}
                    {job.deliverySettings && (
                      <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                        <div className="flex items-center">
                          <Download className="h-3 w-3 mr-1" />
                          {job.deliverySettings.enableDownloads ? "Downloads: On" : "Downloads: Off"}
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {job.deliverySettings.enableComments ? "Comments: On" : "Comments: Off"}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {filteredJobs.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? "Try adjusting your search criteria" : "No jobs match the selected filters"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}