import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Package, Grid, List } from 'lucide-react';
import { ContentGallery } from './ContentGallery';
import { ThumbnailGrid } from './ThumbnailGrid';
import { JPEGFileUpload } from './JPEGFileUpload';
import { ContentItem } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ContentItemsManagerProps {
  jobCardId: number;
}

export const ContentItemsManager: React.FC<ContentItemsManagerProps> = ({ jobCardId }) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('photography');
  const [viewMode, setViewMode] = useState<'grid' | 'gallery'>('grid');

  const queryClient = useQueryClient();

  // Fetch content items
  const { data: contentItems = [], isLoading, error } = useQuery({
    queryKey: ['content-items', jobCardId],
    queryFn: () => {
      console.log(`Fetching content items for job card ${jobCardId}`);
      return apiRequest('GET', `/api/job-cards/${jobCardId}/content-items`);
    },
  });

  console.log('ContentItemsManager - contentItems:', contentItems);
  console.log('ContentItemsManager - isLoading:', isLoading);
  console.log('ContentItemsManager - error:', error);

  // Group content items by category
  const itemsByCategory = contentItems.reduce((acc: any, item: ContentItem) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // Convert content items to gallery files format
  const convertToGalleryFiles = (items: ContentItem[]) => {
    return items.flatMap(item => 
      (item.s3Urls || []).map((url: string, index: number) => ({
        id: `${item.id}-${index}`,
        name: `${item.name}-${index + 1}`,
        url: url.startsWith('http') ? url : `https://rppcentral.s3.ap-southeast-2.amazonaws.com/${url}`,
        size: 2048000, // Placeholder size
        type: 'image/jpeg',
        contentId: item.contentId
      }))
    );
  };

  // Handle file upload completion
  const handleUploadComplete = (files: File[]) => {
    queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] });
    setIsUploadDialogOpen(false);
  };

  // Handle toggle status for category
  const handleToggleStatus = (category: string, enabled: boolean) => {
    // Here you would implement the API call to update the category status
    console.log(`Toggle ${category}:`, enabled);
  };

  // Handle toggle visibility for individual content items
  const handleToggleVisibility = (itemId: number, isVisible: boolean) => {
    // Update content item visibility
    console.log(`Toggle visibility for item ${itemId}:`, isVisible);
  };

  // Handle item click to show full gallery
  const handleItemClick = (item: ContentItem) => {
    console.log('View gallery for item:', item);
    // You could open a modal or navigate to a detailed view here
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
          <h2 className="text-2xl font-semibold">Manage content</h2>
          <p className="text-gray-600">Manage your delivery-ready media in a way that works for you</p>
        </div>
        
        <div className="flex gap-2">
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'gallery')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Gallery
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload JPEG Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload JPEG Files</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="upload-category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="floor_plan">Floor Plans</SelectItem>
                      <SelectItem value="drone">Drone</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <JPEGFileUpload
                  jobCardId={jobCardId}
                  onUploadComplete={handleUploadComplete}
                  serviceCategory={selectedCategory}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content Categories */}
      <div className="space-y-8">
        {viewMode === 'grid' ? (
          // Grid View with ThumbnailGrid
          <div className="space-y-6">
            {/* Photography */}
            {itemsByCategory.photography && (
              <ThumbnailGrid
                contentItems={itemsByCategory.photography}
                category="photography"
                jobCardId={jobCardId}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] })}
                onToggleVisibility={handleToggleVisibility}
                onItemClick={handleItemClick}
              />
            )}

            {/* Floor Plans */}
            {itemsByCategory.floor_plan && (
              <ThumbnailGrid
                contentItems={itemsByCategory.floor_plan}
                category="floor_plan"
                jobCardId={jobCardId}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] })}
                onToggleVisibility={handleToggleVisibility}
                onItemClick={handleItemClick}
              />
            )}

            {/* Drone */}
            {itemsByCategory.drone && (
              <ThumbnailGrid
                contentItems={itemsByCategory.drone}
                category="drone"
                jobCardId={jobCardId}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] })}
                onToggleVisibility={handleToggleVisibility}
                onItemClick={handleItemClick}
              />
            )}

            {/* Video */}
            {itemsByCategory.video && (
              <ThumbnailGrid
                contentItems={itemsByCategory.video}
                category="video"
                jobCardId={jobCardId}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['content-items', jobCardId] })}
                onToggleVisibility={handleToggleVisibility}
                onItemClick={handleItemClick}
              />
            )}
          </div>
        ) : (
          // Gallery View - Original Layout
          <div className="space-y-8">
            {/* Photography */}
            {itemsByCategory.photography && (
              <ContentGallery
                files={convertToGalleryFiles(itemsByCategory.photography)}
                title="Photos"
                contentId={itemsByCategory.photography[0]?.contentId}
                onUpload={() => {
                  setSelectedCategory('photography');
                  setIsUploadDialogOpen(true);
                }}
                onToggleStatus={(enabled) => handleToggleStatus('photography', enabled)}
                isEnabled={true}
              />
            )}

            {/* Floor Plans */}
            {itemsByCategory.floor_plan && (
              <ContentGallery
                files={convertToGalleryFiles(itemsByCategory.floor_plan)}
                title="Floor plan"
                contentId={itemsByCategory.floor_plan[0]?.contentId}
                onUpload={() => {
                  setSelectedCategory('floor_plan');
                  setIsUploadDialogOpen(true);
                }}
                onToggleStatus={(enabled) => handleToggleStatus('floor_plan', enabled)}
                isEnabled={true}
              />
            )}

            {/* Video */}
            {itemsByCategory.video && (
              <ContentGallery
                files={convertToGalleryFiles(itemsByCategory.video)}
                title="Video"
                contentId={itemsByCategory.video[0]?.contentId}
                onUpload={() => {
                  setSelectedCategory('video');
                  setIsUploadDialogOpen(true);
                }}
                onToggleStatus={(enabled) => handleToggleStatus('video', enabled)}
                isEnabled={true}
              />
            )}

            {/* Drone */}
            {itemsByCategory.drone && (
              <ContentGallery
                files={convertToGalleryFiles(itemsByCategory.drone)}
                title="Drone"
                contentId={itemsByCategory.drone[0]?.contentId}
                onUpload={() => {
                  setSelectedCategory('drone');
                  setIsUploadDialogOpen(true);
                }}
                onToggleStatus={(enabled) => handleToggleStatus('drone', enabled)}
                isEnabled={true}
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {contentItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No content items found</p>
            <p className="text-sm text-gray-400 mb-4">
              Upload finished JPEG files to create content items
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload JPEG Files
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};