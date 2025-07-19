import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Upload, Grid, List, FolderPlus, MoreHorizontal, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { JPEGFileUpload } from './JPEGFileUpload';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface ContentManagementGridProps {
  jobCardId: number;
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

export const ContentManagementGrid: React.FC<ContentManagementGridProps> = ({ jobCardId }) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [isEnabled, setIsEnabled] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [folders] = useState(['2250x1500']);

  console.log('ContentManagementGrid - Rendering for job card:', jobCardId);

  // Fetch content items with detailed logging
  const { data: contentItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['content-items', jobCardId],
    queryFn: async () => {
      console.log(`🔍 Fetching content items for job card ${jobCardId}`);
      try {
        const response = await apiRequest('GET', `/api/job-cards/${jobCardId}/content-items`);
        console.log(`✅ Content items response:`, response);
        return response || [];
      } catch (err) {
        console.error(`❌ Error fetching content items:`, err);
        throw err;
      }
    },
    staleTime: 30000,
  });

  console.log('ContentManagementGrid - Final contentItems:', contentItems);

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
    // Use thumbnailUrl if available, otherwise fall back to first S3 URL
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

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          Error loading content items: {error.message}
          <Button onClick={() => refetch()} className="ml-2">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium">Photos</h2>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
            #{jobCardId.toString().padStart(6, '0')}
          </Badge>
          <span className="text-sm text-gray-500">Images</span>
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
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Folders Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
        <div className="flex items-center gap-2">
          {folders.map((folder) => (
            <Badge key={folder} variant="outline" className="bg-white">
              {folder} <span className="ml-1 text-red-500">✕</span>
            </Badge>
          ))}
          <Button variant="outline" size="sm" className="h-8">
            <FolderPlus className="h-4 w-4 mr-1" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Files Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-gray-700">Files</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>1 folders</span>
            <span>/</span>
            <span>{contentItems.length} files</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="h-8"
          >
            {selectedFiles.size === contentItems.length ? 'Deselect All' : 'Select All'}
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

      {/* Content Grid */}
      {contentItems.length === 0 ? (
        <div className="text-center py-12">
          <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
          <p className="text-gray-500 mb-4">Upload finished files to see them here</p>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {contentItems.map((item: ContentFile) => (
            <Card key={item.id} className="group hover:shadow-md transition-shadow bg-white overflow-hidden">
              <div className="relative">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {getImageUrl(item) ? (
                    <img
                      src={getImageUrl(item)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        console.warn(`Failed to load image for ${item.name}:`, getImageUrl(item));
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
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-gray-900 truncate mb-1">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500">
                  JPG • {formatFileSize(item.fileSize)} • {item.category}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};