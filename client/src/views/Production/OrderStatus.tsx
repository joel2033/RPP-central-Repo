import { memo, useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Upload, 
  Eye, 
  Mail, 
  Search,
  Filter,
  MoreHorizontal,
  FileUp,
  CheckCheck,
  Send,
  User,
  Play,
  Pause,
  RotateCcw,
  Truck
} from "lucide-react";
import { JobActionButtons } from '@/components/JobActionButtons';
import { StatusDisplay } from '@/components/StatusDisplay';
import { StatusPill } from '@/components/StatusPill';
import { JobIdBadge } from '@/components/JobIdBadge';
import { getOrderStatus } from '@shared/utils';

interface JobCardWithDetails {
  id: number;
  jobId: string | null;
  status: string;
  requestedServices: string[];
  editingNotes?: string;
  assignedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  // Action-based status timestamps
  uploadedAt?: string | null;
  acceptedAt?: string | null;
  readyForQCAt?: string | null;
  revisionRequestedAt?: string | null;
  history?: Array<{
    action: "upload" | "accept" | "readyForQC" | "revision" | "delivered";
    by: string;
    at: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    name: string;
    email: string;
    contactName: string;
  };
  booking?: {
    id: number;
    propertyAddress: string;
    price: string;
    scheduledDate: string;
    scheduledTime: string;
  };
  editorId?: string;
  photographerId?: string;
}

interface FileUploadData {
  files: File[];
  serviceCategory: string;
  instructions?: string;
}

const OrderStatus = memo(() => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<JobCardWithDetails | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch job cards with details
  const { data: jobCards = [], isLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/job-cards", "with-details"],
    queryFn: async () => {
      const response = await fetch("/api/job-cards?include_details=true");
      if (!response.ok) throw new Error("Failed to fetch job cards");
      return response.json();
    },
  });

  // Status lifecycle mutations
  const acceptJobMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/job-cards/${id}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({ title: "Success", description: "Job accepted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept job", variant: "destructive" });
    },
  });

  const markReadyForQCMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return apiRequest("POST", `/api/job-cards/${id}/mark-ready-qc`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({ title: "Success", description: "Job marked as ready for QC" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark job ready for QC", variant: "destructive" });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return apiRequest("POST", `/api/job-cards/${id}/request-revision`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({ title: "Success", description: "Revision requested successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to request revision", variant: "destructive" });
    },
  });

  const deliverJobMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return apiRequest("POST", `/api/job-cards/${id}/deliver`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({ title: "Success", description: "Job delivered successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to deliver job", variant: "destructive" });
    },
  });

  // File upload mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async ({ jobCardId, formData }: { jobCardId: number; formData: FormData }) => {
      const response = await fetch(`/api/job-cards/${jobCardId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload files");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      setUploadDialogOpen(false);
      toast({ title: "Success", description: "Files uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload files", variant: "destructive" });
    },
  });

  // Send completion email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (jobCardId: number) => {
      const response = await fetch(`/api/job-cards/${jobCardId}/send-delivery-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to send email");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({ title: "Success", description: "Delivery email sent to client" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "unassigned":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "in_progress":
      case "editing":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "ready_for_qa":
      case "ready_for_qc":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "in_revision":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-gray-100 text-gray-800",
      unassigned: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      editing: "bg-blue-100 text-blue-800",
      ready_for_qa: "bg-yellow-100 text-yellow-800",
      ready_for_qc: "bg-yellow-100 text-yellow-800",
      in_revision: "bg-red-100 text-red-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    const label = status === "ready_for_qa" || status === "ready_for_qc" ? "READY FOR QC" : status.replace("_", " ").toUpperCase();
    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {label}
      </Badge>
    );
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "editing", label: "Editing" },
    { value: "ready_for_qa", label: "Ready for QC" },
    { value: "ready_for_qc", label: "Ready for QC" },
    { value: "in_revision", label: "In Revision" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const filteredOrders = jobCards.filter(order => {
    const matchesSearch = 
      (order.jobId?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
      (order.client?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
      (order.booking?.propertyAddress?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false);
    
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    
    // Use the same status logic as StatusPill
    const hasTimestamps = order.uploadedAt || order.acceptedAt || order.readyForQCAt || 
                         order.revisionRequestedAt || order.deliveredAt;
    const currentStatus = hasTimestamps ? getOrderStatus(order) : (order.status || 'pending');
    
    // Handle status matching including legacy status mappings
    if (statusFilter === "in_progress") {
      return currentStatus === "in_progress" || order.status === "editing" || order.status === "in_progress";
    }
    if (statusFilter === "ready_for_qc") {
      return currentStatus === "ready_for_qc" || order.status === "ready_for_qa" || order.status === "ready_for_qc";
    }
    
    return currentStatus === statusFilter || order.status === statusFilter;
  });

  // Action handlers
  const handleAcceptJob = useCallback((orderId: number) => {
    acceptJobMutation.mutate(orderId);
  }, [acceptJobMutation]);

  const handleMarkReadyForQC = useCallback((orderId: number, notes?: string) => {
    markReadyForQCMutation.mutate({ id: orderId, notes });
  }, [markReadyForQCMutation]);

  const handleRequestRevision = useCallback((orderId: number, notes: string) => {
    requestRevisionMutation.mutate({ id: orderId, notes });
  }, [requestRevisionMutation]);

  const handleDeliverJob = useCallback((orderId: number, notes?: string) => {
    deliverJobMutation.mutate({ id: orderId, notes });
  }, [deliverJobMutation]);

  const handleFileUpload = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrder) return;

    const formData = new FormData(event.currentTarget);
    uploadFilesMutation.mutate({ jobCardId: selectedOrder.id, formData });
  }, [selectedOrder, uploadFilesMutation]);

  const handleSendEmail = useCallback((orderId: number) => {
    sendEmailMutation.mutate(orderId);
  }, [sendEmailMutation]);

  const getOrdersByStatus = (status: string) => {
    return jobCards.filter(order => {
      // Use the same status logic as StatusPill and filtering
      const hasTimestamps = order.uploadedAt || order.acceptedAt || order.readyForQCAt || 
                           order.revisionRequestedAt || order.deliveredAt;
      const currentStatus = hasTimestamps ? getOrderStatus(order) : (order.status || 'pending');
      
      if (status === "in_progress") {
        return currentStatus === "in_progress" || order.status === "editing" || order.status === "in_progress";
      }
      if (status === "ready_for_qc") {
        return currentStatus === "ready_for_qc" || order.status === "ready_for_qa" || order.status === "ready_for_qc";
      }
      
      return currentStatus === status || order.status === status;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Status</h1>
            <p className="text-gray-600">Track and manage all orders in production</p>
          </div>
        </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by order ID, client, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({jobCards.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({getOrdersByStatus("pending").length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({getOrdersByStatus("in_progress").length})</TabsTrigger>
          <TabsTrigger value="ready_for_qc">Ready for QC ({getOrdersByStatus("ready_for_qc").length})</TabsTrigger>
          <TabsTrigger value="in_revision">In Revision ({getOrdersByStatus("in_revision").length})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({getOrdersByStatus("delivered").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                Manage order statuses and track production progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Job Address</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Editor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <JobIdBadge 
                            jobCardId={order.id} 
                            jobId={order.jobId} 
                            showAssignButton={true}
                            variant="small"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.booking?.propertyAddress || "Not specified"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.client.name}</div>
                          <div className="text-sm text-gray-500">{order.client.contactName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.editorId ? (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{order.editorId}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <StatusPill order={order} />
                          <JobActionButtons
                            jobCard={order}
                            userRole={user?.role || 'user'}
                            userId={user?.id}
                            onActionComplete={() => {
                              queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        ${order.booking?.price || "0.00"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/jobs/${order.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* Status-specific action buttons */}
                          {(user?.role === 'editor' || user?.role === 'admin') && (
                            <>
                              {order.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAcceptJob(order.id)}
                                  disabled={acceptJobMutation.isPending}
                                  title="Accept Job"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {order.status === "in_progress" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkReadyForQC(order.id)}
                                  disabled={markReadyForQCMutation.isPending}
                                  title="Mark Ready for QC"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                          
                          {(user?.role === 'admin' || user?.role === 'va') && (
                            <>
                              {order.status === "ready_for_qc" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRequestRevision(order.id, "Please make the requested changes")}
                                    disabled={requestRevisionMutation.isPending}
                                    title="Request Revision"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeliverJob(order.id)}
                                    disabled={deliverJobMutation.isPending}
                                    title="Deliver Job"
                                  >
                                    <Truck className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          
                          {order.status === "delivered" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendEmail(order.id)}
                              disabled={sendEmailMutation.isPending}
                              title="Send Delivery Email"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No orders found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload edited files for {selectedOrder?.jobId}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Category</label>
              <Select name="serviceCategory" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="floor_plan">Floor Plans</SelectItem>
                  <SelectItem value="drone">Drone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Files</label>
              <Input
                type="file"
                name="files"
                multiple
                accept="image/*,video/*,.pdf"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Instructions (Optional)</label>
              <Input
                name="instructions"
                placeholder="Any special instructions..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadFilesMutation.isPending}>
                {uploadFilesMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
});

OrderStatus.displayName = "OrderStatus";

export default OrderStatus;