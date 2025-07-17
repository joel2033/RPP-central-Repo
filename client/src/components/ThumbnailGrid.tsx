import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ChevronDown, 
  ChevronRight, 
  Upload, 
  MoreHorizontal, 
  X, 
  FolderPlus,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { JPEGFileUpload } from './JPEGFileUpload';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: number;
  contentId: string;
  category: string;
  name: string;
  description?: string;
  fileCount: number;
  s3Urls: string[];
  thumbnailUrl?: string;
  isActive: boolean;
  status: string;
}

interface ThumbnailGridProps {
  contentItems: ContentItem[];
  category: string;
  jobCardId: number;
  onRefresh: () => void;
  onToggleVisibility: (itemId: number, isVisible: boolean) => void;
  onItemClick: (item: ContentItem) => void;
  className?: string;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  contentItems,
  category,
  jobCardId,
  onRefresh,
  onToggleVisibility,
  onItemClick,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(['2250x1500']);

  const toggleSection = (itemId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'photography': return 'Photos';
      case 'floor_plan': return 'Floor Plans';
      case 'drone': return 'Drone';
      case 'video': return 'Video';
      case 'virtual_tour': return 'Virtual Tour';
      default: return 'Other';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFolder = (folder: string) => {
    setSelectedFolders(prev => prev.filter(f => f !== folder));
  };

  const addFolder = () => {
    const newFolder = prompt('Enter folder name:');
    if (newFolder && !selectedFolders.includes(newFolder)) {
      setSelectedFolders(prev => [...prev, newFolder]);
    }
  };

  if (contentItems.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-gray-500">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No {getCategoryDisplayName(category).toLowerCase()} available</p>
        <p className="text-sm text-gray-400">Upload finished files to see them here</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {contentItems.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection(item.id)}
                  className="p-0 h-6 w-6"
                >
                  {expandedSections[item.id] ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
                
                <span className="font-medium">{getCategoryDisplayName(category)}</span>
                
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                  #{item.contentId}
                </Badge>
                
                <span className="text-sm text-gray-500">Images</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={item.isActive}
                  onCheckedChange={(checked) => onToggleVisibility(item.id, checked)}
                />
                <span className="text-sm text-gray-500">
                  {item.isActive ? 'ON' : 'OFF'}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onItemClick(item)}>
                      View Gallery
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Rename Section
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      Delete Section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Expandable Content */}
            {expandedSections[item.id] && (
              <div className="p-4 space-y-4">
                {/* Folders Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Folders</h4>
                    <span className="text-xs text-gray-500">
                      {selectedFolders.length} folders / {item.fileCount} files
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedFolders.map((folder) => (
                      <Badge key={folder} variant="secondary" className="flex items-center gap-1">
                        {folder}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFolder(folder)}
                          className="h-4 w-4 p-0 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addFolder}
                      className="h-6 text-xs"
                    >
                      <FolderPlus className="h-3 w-3 mr-1" />
                      New Folder
                    </Button>
                  </div>
                </div>

                {/* Files Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Files</h4>
                    
                    <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8">
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Upload Files</DialogTitle>
                        </DialogHeader>
                        <JPEGFileUpload
                          jobCardId={jobCardId}
                          serviceCategory={category}
                          onUploadComplete={() => {
                            setUploadModalOpen(false);
                            onRefresh();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {item.s3Urls.map((url, index) => (
                      <Card 
                        key={index}
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onItemClick(item)}
                      >
                        <CardContent className="p-0">
                          <div className="aspect-square bg-gray-100 flex items-center justify-center">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={`File ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to file icon if thumbnail fails
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full flex items-center justify-center';
                                  fallback.innerHTML = '<svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                  (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                                }}
                              />
                            ) : (
                              <FileText className="h-12 w-12 text-gray-400" />
                            )}
                          </div>
                          
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">
                              File_{index + 1}.jpg
                            </p>
                            <p className="text-xs text-gray-500">
                              + {formatFileSize(1024 * 1024 * 8)} {/* Placeholder size */}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};