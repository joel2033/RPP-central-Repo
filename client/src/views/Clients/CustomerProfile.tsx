import React, { useState, useCallback, memo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Users, 
  FileText, 
  Plus,
  Edit,
  DollarSign,
  Calendar,
  CheckCircle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Copy,
  RotateCcw
} from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { AsyncBoundary } from '@/components/shared/AsyncBoundary';
import { formatDate, formatCurrency, formatPhoneNumber } from '@/utils/formatting';
import { API_ENDPOINTS } from '@/utils/constants';
import type { Client, JobCard } from '@shared/schema';

interface CustomerProfileProps {
  id: string;
}

interface CustomerMetrics {
  totalJobs: number;
  totalSales: number;
  averageJobValue: number;
  completedJobs: number;
}

interface CustomerNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

const CustomerNotesModal = memo(({ 
  client, 
  onUpdate 
}: { 
  client: Client; 
  onUpdate: (notes: string[]) => void;
}) => {
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleAddNote = useCallback(() => {
    if (newNote.trim()) {
      const updatedNotes = [...notes, newNote.trim()];
      setNotes(updatedNotes);
      setNewNote('');
      onUpdate(updatedNotes);
      toast({
        title: "Note added",
        description: "Customer note has been saved successfully."
      });
    }
  }, [newNote, notes, onUpdate, toast]);

  const handleRemoveNote = useCallback((index: number) => {
    const updatedNotes = notes.filter((_, i) => i !== index);
    setNotes(updatedNotes);
    onUpdate(updatedNotes);
  }, [notes, onUpdate]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Customer Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Customer Notes - {client.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {notes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No notes yet"
              description="Add your first note about this customer"
            />
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <p className="text-sm">{note}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveNote(index)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Label>Add New Note</Label>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Enter note about this customer..."
            className="min-h-[100px]"
          />
          <Button onClick={handleAddNote} className="w-full">
            Add Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CustomerNotesModal.displayName = 'CustomerNotesModal';

const CustomerProfileContent = memo(({ id }: CustomerProfileProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [_, navigate] = useLocation();

  // Fetch customer data
  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [API_ENDPOINTS.CLIENTS, id],
    queryFn: async () => {
      const response = await apiRequest("GET", `${API_ENDPOINTS.CLIENTS}/${id}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch customer jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobCard[]>({
    queryKey: [API_ENDPOINTS.JOB_CARDS, 'client', id],
    queryFn: async () => {
      const response = await apiRequest("GET", `${API_ENDPOINTS.JOB_CARDS}?clientId=${id}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (updates: Partial<Client>) => {
      const response = await apiRequest("PUT", `${API_ENDPOINTS.CLIENTS}/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.CLIENTS, id] });
      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer information.",
        variant: "destructive"
      });
    }
  });

  // Calculate metrics
  const metrics = React.useMemo<CustomerMetrics>(() => {
    if (!jobs.length) return { totalJobs: 0, totalSales: 0, averageJobValue: 0, completedJobs: 0 };
    
    const completedJobs = jobs.filter(job => job.status === 'delivered').length;
    const totalSales = jobs.reduce((sum, job) => sum + (parseFloat(job.price || '0') || 0), 0);
    const averageJobValue = jobs.length > 0 ? totalSales / jobs.length : 0;
    
    return {
      totalJobs: jobs.length,
      totalSales,
      averageJobValue,
      completedJobs
    };
  }, [jobs]);

  // Filter jobs
  const filteredJobs = React.useMemo(() => {
    return jobs.filter(job => {
      const propertyAddress = job.propertyAddress || '';
      const jobId = job.jobId || '';
      const matchesSearch = propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           jobId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  const handleUpdateNotes = useCallback((notes: string[]) => {
    // Temporarily disabled until DB migration
    toast({
      title: "Coming Soon",
      description: "Notes feature will be available after database migration."
    });
  }, [toast]);

  const handleCreateNewJob = useCallback(() => {
    navigate(`/bookings?clientId=${id}`);
  }, [id, navigate]);

  const handleViewJob = useCallback((jobId: string) => {
    navigate(`/jobs/${jobId}`);
  }, [navigate]);

  if (clientLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState
        icon={<User className="h-12 w-12" />}
        title="Customer not found"
        description="The customer you're looking for doesn't exist."
      />
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Profile</h1>
          <p className="text-gray-600">Complete customer information and job history</p>
        </div>
        <Button onClick={handleCreateNewJob} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Job
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={client.profileImageUrl} />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{client.name}</h2>
                  <p className="text-sm text-gray-600">{client.contactName}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{client.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{formatPhoneNumber(client.phone) || 'No phone provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">No agency specified</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{client.address || 'No address provided'}</span>
                </div>
              </div>

              {/* Tags - temporarily disabled until DB migration */}
              <div>
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-sm text-gray-500">No tags (feature coming soon)</span>
                </div>
              </div>

              {/* Team Members - temporarily disabled until DB migration */}
              <div>
                <Label className="text-sm font-medium">Team Members</Label>
                <div className="mt-2 space-y-2">
                  <span className="text-sm text-gray-500">No team members (feature coming soon)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t">
                <CustomerNotesModal client={client} onUpdate={handleUpdateNotes} />
              </div>
            </CardContent>
          </Card>

          {/* Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Delivery Instructions</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    No special preferences
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Editing Preferences</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {client.editingPreferences ? 
                      JSON.stringify(client.editingPreferences, null, 2) : 
                      'No editing preferences set'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metrics and Job History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{formatCurrency(metrics.totalSales)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Job Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{formatCurrency(metrics.averageJobValue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">{metrics.totalJobs}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Job History</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="ready_for_qc">Ready for QC</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredJobs.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title="No jobs found"
                  description="No jobs match your current search criteria."
                />
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium">{job.propertyAddress || 'No address'}</h3>
                            <p className="text-sm text-gray-600">{job.jobId || 'No job ID'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{formatDate(job.scheduledDate)}</span>
                          <span>{job.scheduledTime || 'No time set'}</span>
                          <span>{formatCurrency(job.price || '0')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill order={job} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewJob(job.id.toString())}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

CustomerProfileContent.displayName = 'CustomerProfileContent';

const CustomerProfile = memo(() => {
  const params = useParams();
  const id = params.id as string;

  if (!id) {
    return (
      <Layout title="Customer Profile">
        <EmptyState
          icon={<User className="h-12 w-12" />}
          title="Invalid customer ID"
          description="Please select a valid customer to view their profile."
        />
      </Layout>
    );
  }

  return (
    <Layout title="Customer Profile">
      <AsyncBoundary>
        <CustomerProfileContent id={id} />
      </AsyncBoundary>
    </Layout>
  );
});

CustomerProfile.displayName = 'CustomerProfile';

export default CustomerProfile;