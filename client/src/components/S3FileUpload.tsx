import React, { useState, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface S3FileUploadProps {
  jobCardId: number;
  onUploadComplete: (fileData: any) => void;
  onUploadError: (error: string) => void;
  mediaType?: string;
  serviceCategory?: string;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  s3Key?: string;
}

export const S3FileUpload: React.FC<S3FileUploadProps> = ({
  jobCardId,
  onUploadComplete,
  onUploadError,
  mediaType = 'raw',
  serviceCategory = 'general',
  disabled = false,
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelection(files);
    }
  }, []);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 2GB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  };

  const handleFileSelection = async (files: File[]) => {
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        onUploadError(`${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    
    // Initialize uploading files state
    const initialUploadingFiles = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploadingFiles(initialUploadingFiles);

    // Upload files with retry logic
    const uploadPromises = validFiles.map(file => uploadFileWithRetry(file));
    
    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFileWithRetry = async (file: File, retries = 3): Promise<void> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await uploadFile(file);
        return;
      } catch (error) {
        console.error(`Upload attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries - 1) {
          updateFileStatus(file, 'error', 0, `Upload failed after ${retries} attempts`);
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  };

  const uploadFile = async (file: File): Promise<void> => {
    try {
      // Step 1: Get presigned upload URL
      const uploadUrlResponse = await apiRequest('POST', `/api/job-cards/${jobCardId}/files/upload-url`, {
        fileName: file.name,
        contentType: file.type,
        mediaType, // This determines S3 tags: 'raw' → type:raw, 'final' → type:finished
        fileSize: file.size
      });

      const { uploadUrl, s3Key } = uploadUrlResponse;

      // Step 2: Upload file directly to S3 with progress tracking
      await uploadToS3(file, uploadUrl, s3Key);

      // Step 3: Save metadata to database
      await apiRequest('POST', `/api/job-cards/${jobCardId}/files/metadata`, {
        fileName: file.name,
        originalName: file.name,
        s3Key,
        fileSize: file.size,
        mimeType: file.type,
        mediaType,
        serviceCategory
      });

      updateFileStatus(file, 'success', 100);
      onUploadComplete({ fileName: file.name, s3Key, fileSize: file.size });
    } catch (error) {
      console.error('Upload failed:', error);
      updateFileStatus(file, 'error', 0, error.message);
      throw error;
    }
  };

  const uploadToS3 = async (file: File, uploadUrl: string, s3Key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          updateFileStatus(file, 'uploading', progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Upload failed'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const updateFileStatus = (file: File, status: 'uploading' | 'success' | 'error', progress: number, error?: string) => {
    setUploadingFiles(prev => 
      prev.map(uf => 
        uf.file.name === file.name 
          ? { ...uf, status, progress, error }
          : uf
      )
    );
  };

  const removeUploadingFile = (fileName: string) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file.name !== fileName));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Drag and drop files here, or click to select
              </p>
              <p className="text-xs text-gray-500">
                Max file size: 2GB • Supported: Images, Videos, PDFs, ZIP files
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.zip"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={disabled}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={disabled || isUploading}
                asChild
              >
                <span>Select Files</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(uploadingFile.file.size)}
                    </span>
                  </div>
                  
                  {uploadingFile.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <Progress value={uploadingFile.progress} className="flex-1" />
                      <span className="text-xs text-gray-500">
                        {uploadingFile.progress}%
                      </span>
                    </div>
                  )}
                  
                  {uploadingFile.status === 'success' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Upload complete</span>
                    </div>
                  )}
                  
                  {uploadingFile.status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{uploadingFile.error}</span>
                    </div>
                  )}
                </div>
                
                {uploadingFile.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(uploadingFile.file.name)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};