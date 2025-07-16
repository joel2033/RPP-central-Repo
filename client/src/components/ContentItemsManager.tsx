import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Filter, Search, RefreshCw } from 'lucide-react';
import { ContentItemCard } from './ContentItemCard';
import { ContentItem } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ContentItemsManagerProps {
  jobCardId: number;
}

export const ContentItemsManager: React.FC<ContentItemsManagerProps> = ({ jobCardId }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: 'photography',
  });

  const queryClient = useQueryClient();

  // Fetch content items
  const { data: contentItems = [], isLoading, error } = useQuery({
    queryKey: ['content-items', jobCardId],
    queryFn: () => apiRequest('GET', `/api/job-cards/${jobCardId}/content-items`),
  });

  // Create content item mutation
  const createMutation = useMutation({
    mutationFn: (itemData: any) => 
      apiRequest('POST', `/api/job-cards/${jobCardId}/content-items`, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] });
      setIsCreateDialogOpen(false);
      setNewItem({ name: '', description: '', category: 'photography' });
    },
  });

  // Update content item mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<ContentItem> }) =>
      apiRequest('PUT', `/api/content-items/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] });
    },
  });

  // Delete content item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/content-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] });
    },
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest('PUT', `/api/content-items/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] });
    },
  });

  // Filter content items
  const filteredItems = contentItems.filter((item: ContentItem) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Status summary
  const statusCounts = contentItems.reduce((acc: any, item: ContentItem) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const handleCreateItem = () => {
    if (!newItem.name.trim()) return;
    
    createMutation.mutate(newItem);
  };

  const handleUpdateItem = (id: number, updates: Partial<ContentItem>) => {
    updateMutation.mutate({ id, updates });
  };

  const handleDeleteItem = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: number, status: string) => {
    statusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading content items: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Content Items</h2>
          <p className="text-gray-600">Manage job content pieces and their delivery status</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Content Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Content Item</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., #00123 Images ON"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="floor_plan">Floor Plans</SelectItem>
                    <SelectItem value="drone">Drone</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Content item description"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateItem}
                  disabled={!newItem.name.trim() || createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Item'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
          { key: 'ready_for_qc', label: 'Ready for QC', color: 'bg-blue-100 text-blue-800' },
          { key: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
          { key: 'delivered', label: 'Delivered', color: 'bg-purple-100 text-purple-800' },
          { key: 'in_revision', label: 'In Revision', color: 'bg-yellow-100 text-yellow-800' },
        ].map((status) => (
          <Card key={status.key} className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{statusCounts[status.key] || 0}</div>
              <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search content items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="photography">Photography</SelectItem>
              <SelectItem value="floor_plan">Floor Plans</SelectItem>
              <SelectItem value="drone">Drone</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready_for_qc">Ready for QC</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="in_revision">In Revision</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content items found</h3>
            <p className="text-gray-600">
              {contentItems.length === 0 
                ? 'Create your first content item to get started.'
                : 'No content items match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item: ContentItem) => (
            <ContentItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onStatusChange={handleStatusChange}
              disabled={updateMutation.isPending || deleteMutation.isPending || statusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};