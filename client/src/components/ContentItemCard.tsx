import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Edit, 
  Save, 
  X, 
  FileText, 
  Image, 
  Video, 
  Map, 
  Folder,
  Eye,
  EyeOff,
  Check,
  Clock,
  AlertCircle,
  Send
} from 'lucide-react';
import { ContentItem } from '@shared/schema';

interface ContentItemCardProps {
  item: ContentItem;
  onUpdate: (id: number, updates: Partial<ContentItem>) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  disabled?: boolean;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  ready_for_qc: { label: 'Ready for QC', color: 'bg-blue-100 text-blue-800', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: Check },
  delivered: { label: 'Delivered', color: 'bg-purple-100 text-purple-800', icon: Send },
  in_revision: { label: 'In Revision', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
};

const categoryConfig = {
  photography: { label: 'Photography', icon: Image, color: 'bg-blue-500' },
  floor_plan: { label: 'Floor Plans', icon: Map, color: 'bg-green-500' },
  drone: { label: 'Drone', icon: Video, color: 'bg-purple-500' },
  video: { label: 'Video', icon: Video, color: 'bg-red-500' },
  other: { label: 'Other', icon: Folder, color: 'bg-gray-500' },
};

export const ContentItemCard: React.FC<ContentItemCardProps> = ({
  item,
  onUpdate,
  onDelete,
  onStatusChange,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedDescription, setEditedDescription] = useState(item.description || '');

  const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
  const categoryInfo = categoryConfig[item.category as keyof typeof categoryConfig];
  const StatusIcon = statusInfo?.icon || FileText;
  const CategoryIcon = categoryInfo?.icon || Folder;

  const handleSave = () => {
    onUpdate(item.id, {
      name: editedName,
      description: editedDescription,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(item.name);
    setEditedDescription(item.description || '');
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(item.id, newStatus);
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoryInfo.color} text-white`}>
              <CategoryIcon size={20} />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Content item name"
                />
              ) : (
                <CardTitle className="text-lg">{item.name}</CardTitle>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {categoryInfo.label}
                </Badge>
                <Badge className={`text-xs ${statusInfo.color}`}>
                  <StatusIcon size={12} className="mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                >
                  <Save size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-8 w-8 p-0"
                >
                  <X size={14} />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <Edit size={14} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Description</Label>
          {isEditing ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Content item description"
              className="mt-1"
              rows={2}
            />
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              {item.description || 'No description'}
            </p>
          )}
        </div>
        
        {/* File Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">File Count</Label>
            <p className="mt-1 text-sm font-medium">{item.fileCount || 0} files</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <Select
              value={item.status}
              onValueChange={handleStatusChange}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon size={14} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* S3 URLs */}
        {item.s3Urls && item.s3Urls.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700">Files</Label>
            <div className="mt-1 space-y-1">
              {item.s3Urls.slice(0, 3).map((url, index) => (
                <div key={index} className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  {url.split('/').pop()}
                </div>
              ))}
              {item.s3Urls.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{item.s3Urls.length - 3} more files
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <Label className="text-xs font-medium text-gray-500">Created</Label>
            <p>{new Date(item.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500">Updated</Label>
            <p>{new Date(item.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(item.id, 'ready_for_qc')}
            disabled={disabled || item.status === 'ready_for_qc'}
            className="flex-1"
          >
            <Eye size={14} className="mr-2" />
            Submit for QC
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(item.id, 'approved')}
            disabled={disabled || item.status === 'approved'}
            className="flex-1"
          >
            <Check size={14} className="mr-2" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};