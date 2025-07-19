import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FolderPlus, MoreHorizontal, Image, Download, Eye, Video, Map, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { JPEGFileUpload } from './JPEGFileUpload';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface UnifiedFileManagementProps {
  jobCardId: number;
}

interface ProductionFile {
  id: number;
  jobCardId: number;
  fileName: string;
  filePath?: string;
  mimeType?: string;
  serviceCategory: string;
  fileSize?: number;
  uploadedAt: string;
  s3Key?: string;
  s3Bucket?: string;
}

interface ContentFile {
  id: number;
  name: string;
  thumbUrl?: string;
  thumbnailUrl?: string;
  s3Urls: string[];
  category: string;
  fileSize?: number;
  status: string;
  contentId: string;
}

export const UnifiedFileManagement: React.FC<UnifiedFileManagementProps> = ({ jobCardId }) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [isEnabled, setIsEnabled] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const [folders] = useState(['2250x1500']);

  // Debug: Log component mount and jobCardId
  console.log('🚀 UnifiedFileManagement component rendered with jobCardId:', jobCardId);

  // Fetch regular production files
  const { data: productionFiles = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ['production-files', jobCardId],
    queryFn: () => {
      console.log('🔍 UnifiedFileManagement - Fetching production files for:', jobCardId);
      return apiRequest('GET', `/api/jobs/${jobCardId}/files`);
    },
  });

  // Fetch finished content items (editor uploads)
  const { data: contentItems = [], isLoading: isLoadingContent, refetch, error: contentError } = useQuery({
    queryKey: ['content-items', jobCardId],
    queryFn: async () => {
      console.log(`🔍 UnifiedFileManagement - Fetching content items for job card ${jobCardId}`);
      try {
        const response = await apiRequest('GET', `/api/job-cards/${jobCardId}/content-items`);
        console.log(`✅ UnifiedFileManagement - Content items response:`, response);
        return response || [];
      } catch (err) {
        console.error(`❌ UnifiedFileManagement - Error fetching content items:`, err);
        // Return empty array on error to avoid breaking the UI
        return [];
      }
    },
    staleTime: 30000,
    // Don't retry on auth errors
    retry: false,
  });

  // Log the content error if it exists
  if (contentError) {
    console.error('UnifiedFileManagement - Content items query error:', contentError);
  }

  const isLoading = isLoadingFiles || isLoadingContent;

  // Categorize files
  const getFilesByCategory = (category: string) => {
    return productionFiles.filter((file: ProductionFile) => file.serviceCategory === category);
  };

  // Get content items by category
  const getContentItemsByCategory = (category: string) => {
    return contentItems.filter((item: ContentFile) => item.category === category);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === contentItems.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(contentItems.map((item: ContentFile) => item.id)));
    }
  };

  const handleFileSelect = (fileId: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const formatFileSize = (bytes: number = 0): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getImageUrl = (item: ContentFile): string => {
    if (item.thumbnailUrl) return item.thumbnailUrl;
    if (item.s3Urls && item.s3Urls.length > 0) {
      const url = item.s3Urls[0];
      return url.startsWith('http') ? url : `https://rppcentral.s3.ap-southeast-2.amazonaws.com/${url}`;
    }
    return '';
  };

  const handleUploadSuccess = () => {
    refetch();
    setIsUploadOpen(false);
    toast({
      title: "Upload Successful",
      description: "Files have been uploaded and will appear in the grid shortly.",
    });
  };

  // Render file grid with thumbnails for content items and file icons for production files
  const renderUnifiedFileGrid = (files: ProductionFile[], contentFiles: ContentFile[]) => {
    if (files.length === 0 && contentFiles.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Image className="h-8 w-8 mx-auto mb-2" />
          <p>No files uploaded yet</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Render content items (finished editor uploads) with thumbnails */}
        {contentFiles.map((item: ContentFile) => (
          <Card key={`content-${item.id}`} className="group hover:shadow-md transition-shadow bg-white overflow-hidden">
            <div className="relative">
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {getImageUrl(item) ? (
                  <img
                    src={getImageUrl(item)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTQwSDgwVjYwWiIgZmlsbD0iI0Q1RDdEQSIvPgo8L3N2Zz4K';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedFiles.has(item.id)}
                  onCheckedChange={() => handleFileSelect(item.id)}
                  className="bg-white bg-opacity-90"
                />
              </div>
              <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">Finished</Badge>
            </div>
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 truncate mb-1">
                {item.name}
              </div>
              <div className="text-xs text-gray-500">
                JPG • {formatFileSize(item.fileSize)} • Ready for delivery
              </div>
            </div>
          </Card>
        ))}

        {/* Render production files (raw uploads) with file icons */}
        {files.map((file: ProductionFile) => (
          <Card key={`file-${file.id}`} className="group hover:shadow-md transition-shadow bg-white overflow-hidden">
            <div className="relative">
              <div className="aspect-square bg-gray-50 overflow-hidden flex items-center justify-center">
                {file.mimeType?.startsWith('image/') ? (
                  <Image className="h-12 w-12 text-gray-400" />
                ) : file.mimeType?.startsWith('video/') ? (
                  <Video className="h-12 w-12 text-gray-400" />
                ) : file.serviceCategory === 'floor_plan' ? (
                  <Map className="h-12 w-12 text-gray-400" />
                ) : (
                  <FileText className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <Badge className="absolute top-2 right-2 bg-blue-100 text-blue-800">Raw</Badge>
            </div>
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 truncate mb-1">
                {file.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {file.mimeType?.split('/')[1].toUpperCase()} • {formatFileSize(file.fileSize)} • Raw file
              </div>
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium">Files & Media</h2>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
            #{jobCardId.toString().padStart(6, '0')}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">ON</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              className="data-[state=checked]:bg-green-500"
            />
            <span className="text-sm text-gray-600">OFF</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="h-8"
          >
            {selectedFiles.size > 0 ? 'Deselect All' : 'Select All'}
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Finished Files</DialogTitle>
              </DialogHeader>
              <JPEGFileUpload
                jobCardId={jobCardId}
                onUploadSuccess={handleUploadSuccess}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* File Categories */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Files</TabsTrigger>
          <TabsTrigger value="photography">Photos</TabsTrigger>
          <TabsTrigger value="floor_plan">Floor Plans</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{productionFiles.length + contentItems.length} files total</span>
              <span>•</span>
              <span>{contentItems.length} finished</span>
              <span>•</span>
              <span>{productionFiles.length} raw</span>
            </div>
          </div>
          {renderUnifiedFileGrid(productionFiles, contentItems)}
        </TabsContent>

        <TabsContent value="photography" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Photography Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos
            </Button>
          </div>
          {renderUnifiedFileGrid(
            getFilesByCategory("photography"), 
            getContentItemsByCategory("photography")
          )}
        </TabsContent>

        <TabsContent value="floor_plan" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Floor Plan Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Floor Plans
            </Button>
          </div>
          {renderUnifiedFileGrid(
            getFilesByCategory("floor_plan"), 
            getContentItemsByCategory("floor_plan")
          )}
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Video Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Videos
            </Button>
          </div>
          {renderUnifiedFileGrid(
            getFilesByCategory("video"), 
            getContentItemsByCategory("video")
          )}
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Other Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
          {renderUnifiedFileGrid(
            getFilesByCategory("other"), 
            getContentItemsByCategory("other")
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};