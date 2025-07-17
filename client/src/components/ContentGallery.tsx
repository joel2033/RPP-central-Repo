import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Grid, Gallery, ChevronLeft, ChevronRight, Download, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  contentId?: string;
}

interface ContentGalleryProps {
  files: ContentFile[];
  title: string;
  contentId?: string;
  className?: string;
  onUpload?: () => void;
  onToggleStatus?: (enabled: boolean) => void;
  isEnabled?: boolean;
}

export const ContentGallery: React.FC<ContentGalleryProps> = ({
  files,
  title,
  contentId,
  className,
  onUpload,
  onToggleStatus,
  isEnabled = true
}) => {
  const [viewMode, setViewMode] = useState<'tiles' | 'gallery'>('tiles');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleImageClick = (index: number) => {
    setSelectedImage(index);
    setIsGalleryOpen(true);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;
    
    if (direction === 'prev') {
      setSelectedImage(selectedImage > 0 ? selectedImage - 1 : files.length - 1);
    } else {
      setSelectedImage(selectedImage < files.length - 1 ? selectedImage + 1 : 0);
    }
  };

  const downloadFile = (file: ContentFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  };

  const renderTilesView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {contentId && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              #{contentId}
            </Badge>
          )}
          <Badge variant="outline">{files.length} Images</Badge>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">ON</span>
            <div 
              className={cn(
                "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors",
                isEnabled ? "bg-green-500" : "bg-gray-300"
              )}
              onClick={() => onToggleStatus?.(!isEnabled)}
            >
              <div className={cn(
                "w-4 h-4 rounded-full bg-white transition-transform",
                isEnabled ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'tiles' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tiles')}
          >
            <Grid className="h-4 w-4 mr-1" />
            Tiles
          </Button>
          <Button
            variant={viewMode === 'gallery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('gallery')}
          >
            <Gallery className="h-4 w-4 mr-1" />
            Gallery
          </Button>
          {onUpload && (
            <Button onClick={onUpload} size="sm">
              Upload
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file, index) => (
          <Card key={file.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="aspect-square relative" onClick={() => handleImageClick(index)}>
              <img 
                src={file.url} 
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <CardContent className="p-3">
              <div className="text-sm font-medium truncate">{file.name}</div>
              <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                <span>{formatFileSize(file.size)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(file);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderGalleryView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {contentId && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              #{contentId}
            </Badge>
          )}
          <Badge variant="outline">{files.length} Images</Badge>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">ON</span>
            <div 
              className={cn(
                "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors",
                isEnabled ? "bg-green-500" : "bg-gray-300"
              )}
              onClick={() => onToggleStatus?.(!isEnabled)}
            >
              <div className={cn(
                "w-4 h-4 rounded-full bg-white transition-transform",
                isEnabled ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'tiles' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tiles')}
          >
            <Grid className="h-4 w-4 mr-1" />
            Tiles
          </Button>
          <Button
            variant={viewMode === 'gallery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('gallery')}
          >
            <Gallery className="h-4 w-4 mr-1" />
            Gallery
          </Button>
          {onUpload && (
            <Button onClick={onUpload} size="sm">
              Upload
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {files.map((file, index) => (
          <Card key={file.id} className="overflow-hidden">
            <div className="flex">
              <div className="w-48 h-32 flex-shrink-0">
                <img 
                  src={file.url} 
                  alt={file.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleImageClick(index)}
                />
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{file.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImageClick(index)}
                    >
                      <ZoomIn className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(file)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className={className}>
      {viewMode === 'tiles' ? renderTilesView() : renderGalleryView()}

      {/* Full Screen Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>{files[selectedImage || 0]?.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {(selectedImage || 0) + 1} of {files.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGalleryOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative flex-1 flex items-center justify-center bg-gray-50 min-h-[60vh]">
            {selectedImage !== null && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <img 
                  src={files[selectedImage]?.url} 
                  alt={files[selectedImage]?.name}
                  className="max-w-full max-h-full object-contain"
                />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
          
          <div className="p-6 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {files[selectedImage || 0] && formatFileSize(files[selectedImage || 0].size)}
              </div>
              <Button
                onClick={() => selectedImage !== null && downloadFile(files[selectedImage])}
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};