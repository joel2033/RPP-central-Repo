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
import { CentralizedS3Upload } from './CentralizedS3Upload';
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
  mediaType?: string; // raw, edited, final
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

  // Fetch production files (only finished/edited files, exclude RAW files)
  const { data: allProductionFiles = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ['production-files', jobCardId],
    queryFn: () => {
      console.log('🔍 UnifiedFileManagement - Fetching production files for:', jobCardId);
      return apiRequest('GET', `/api/jobs/${jobCardId}/files`);
    },
  });

  // Filter out RAW files - only show finished/edited files uploaded via Files & Media
  const productionFiles = allProductionFiles.filter((file: ProductionFile) => 
    file.mediaType !== 'raw'
  );

  console.log('🔍 UnifiedFileManagement - All production files:', allProductionFiles.length);
  console.log('🔍 UnifiedFileManagement - Filtered production files (non-RAW):', productionFiles.length);

  // Fetch finished content items (editor uploads)
  const { data: contentItems = [], isLoading: isLoadingContent, refetch, error: contentError } = useQuery({
    queryKey: ['content-items', jobCardId], // Stable cache key
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
    staleTime: 0, // Force fresh data
    refetchInterval: false, // Disable auto-refetch
    // Don't retry on auth errors
    retry: false,
  });

  // Log the content error if it exists
  if (contentError) {
    console.error('UnifiedFileManagement - Content items query error:', contentError);
  }

  // Debug: Log content items count after they're loaded
  console.log('🔍 UnifiedFileManagement - Content items (editor uploads):', contentItems.length);

  const isLoading = isLoadingFiles || isLoadingContent;

  // Removed getFilesByCategory and getContentItemsByCategory - now handled in unified renderFileGrid

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
    console.log('🖼️ Getting image URL for item:', item.name, 'thumbnailUrl:', item.thumbnailUrl, 'thumbUrl:', item.thumbUrl, 's3Urls:', item.s3Urls);
    
    // First try the generated thumbnailUrl (presigned URL)
    if (item.thumbnailUrl) {
      console.log('✅ Using thumbnailUrl (presigned):', item.thumbnailUrl.substring(0, 60) + '...');
      return item.thumbnailUrl;
    }
    
    // Fallback to thumbUrl if it's an HTTP URL
    if (item.thumbUrl && item.thumbUrl.startsWith('http')) {
      console.log('✅ Using thumbUrl (HTTP):', item.thumbUrl);
      return item.thumbUrl;
    }
    
    // Fallback to thumbUrl as S3 key
    if (item.thumbUrl && !item.thumbUrl.startsWith('http')) {
      const finalUrl = `https://rppcentral.s3.ap-southeast-2.amazonaws.com/${item.thumbUrl}`;
      console.log('✅ Using thumbUrl as S3 key:', finalUrl);
      return finalUrl;
    }
    
    // Fallback to first s3Url
    if (item.s3Urls && item.s3Urls.length > 0) {
      const url = item.s3Urls[0];
      const finalUrl = url.startsWith('http') ? url : `https://rppcentral.s3.ap-southeast-2.amazonaws.com/${url}`;
      console.log('✅ Using s3Url:', finalUrl);
      return finalUrl;
    }
    
    console.log('❌ No image URL found for item:', item.name);
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

  // Manual refetch button for testing
  const handleManualRefetch = () => {
    console.log('🔄 Manually refetching content items...');
    // Add timestamp to force cache invalidation
    refetch();
  };

  // Unified file grid renderer for all content types
  const renderFileGrid = (category?: string) => {
    // Filter content items by category if specified
    const filteredContentItems = category 
      ? contentItems.filter(item => item.category === category)
      : contentItems;

    // Filter production files by category if specified  
    const filteredProductionFiles = category
      ? productionFiles.filter(file => file.serviceCategory === category)
      : productionFiles;

    // Combine all files for unified display
    const allFiles = [
      ...filteredContentItems.map(item => ({
        id: `content-${item.id}`,
        name: item.name,
        type: 'content' as const,
        fileSize: item.fileSize,
        status: 'Finished' as const,
        badgeColor: 'bg-green-100 text-green-800',
        thumbnailUrl: getImageUrl(item),
        hasImage: true,
        item
      })),
      ...filteredProductionFiles.map(file => ({
        id: `file-${file.id}`,
        name: file.fileName,
        type: 'production' as const,
        fileSize: file.fileSize,
        status: file.mediaType === 'final' ? 'Final' : 'Uploaded',
        badgeColor: 'bg-blue-100 text-blue-800',
        thumbnailUrl: null,
        hasImage: file.mimeType?.startsWith('image/'),
        file
      }))
    ];

    if (allFiles.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Image className="h-8 w-8 mx-auto mb-2" />
          <p>No files uploaded yet</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allFiles.map((fileItem) => (
          <Card key={fileItem.id} className="group hover:shadow-md transition-shadow bg-white overflow-hidden">
            <div className="relative">
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {fileItem.thumbnailUrl ? (
                  <img
                    src={fileItem.thumbnailUrl}
                    alt={fileItem.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      console.error(`❌ Failed to load image: ${fileItem.thumbnailUrl}`);
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTQwSDgwVjYwWiIgZmlsbD0iI0Q1RDdEQSIvPgo8L3N2Zz4K';
                    }}
                    onLoad={() => {
                      console.log(`✅ Successfully loaded image: ${fileItem.thumbnailUrl}`);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    {fileItem.hasImage ? (
                      <Image className="h-12 w-12 text-gray-400" />
                    ) : fileItem.type === 'production' && fileItem.file?.mimeType?.startsWith('video/') ? (
                      <Video className="h-12 w-12 text-gray-400" />
                    ) : fileItem.type === 'production' && fileItem.file?.serviceCategory === 'floor_plan' ? (
                      <Map className="h-12 w-12 text-gray-400" />
                    ) : (
                      <FileText className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                )}
              </div>
              
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedFiles.has(fileItem.id)}
                  onCheckedChange={() => handleFileSelect(fileItem.id)}
                  className="bg-white bg-opacity-90"
                />
              </div>
              
              <Badge className={`absolute top-2 right-2 ${fileItem.badgeColor}`}>
                {fileItem.status}
              </Badge>
            </div>
            
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 truncate mb-1">
                {fileItem.name}
              </div>
              <div className="text-xs text-gray-500">
                {fileItem.type === 'content' ? 'JPG' : fileItem.file?.mimeType?.split('/')[1].toUpperCase()} • {formatFileSize(fileItem.fileSize)} • {fileItem.status === 'Finished' ? 'Ready for delivery' : 'Uploaded file'}
              </div>
              
              {fileItem.type === 'production' && (
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
              )}
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
          <button 
            onClick={handleManualRefetch}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Refresh URLs
          </button>
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
              <CentralizedS3Upload
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
          {renderFileGrid()}
        </TabsContent>

        <TabsContent value="photography" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Photography Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos
            </Button>
          </div>
          {renderFileGrid("photography")}
        </TabsContent>

        <TabsContent value="floor_plan" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Floor Plan Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Floor Plans
            </Button>
          </div>
          {renderFileGrid("floor_plan")}
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Video Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Videos
            </Button>
          </div>
          {renderFileGrid("video")}
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Other Files</h3>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
          {renderFileGrid("other")}
        </TabsContent>
      </Tabs>
    </div>
  );
};