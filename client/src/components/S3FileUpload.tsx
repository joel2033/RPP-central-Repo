import React, { useState, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  status: 'uploading' | 'success' | 'error' | 'retrying';
  error?: string;
  s3Key?: string;
  retryCount?: number;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

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
      'image/tiff',
      'image/x-adobe-dng',
      'image/x-canon-cr2',
      'image/x-canon-crw',
      'image/x-nikon-nef',
      'image/x-sony-arw',
      'image/x-panasonic-raw',
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

  const uploadFileWithRetry = async (file: File, retries = 5): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        updateFileStatus(file, attempt === 1 ? 'uploading' : 'retrying', 0, 
          attempt === 1 ? undefined : `Retrying... (${attempt}/${retries})`);
        
        await uploadFile(file);
        return;
      } catch (error: any) {
        console.error(`Upload attempt ${attempt} failed for ${file.name}:`, error);
        
        // Add specific error handling
        let errorMessage = error.message;
        if (error.message.includes('CORS')) {
          errorMessage = 'Upload blocked by browser - trying alternative method';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out - check your connection';
        } else if (error.message.includes('Access Denied')) {
          errorMessage = 'S3 access denied - check credentials';
        } else if (error.message.includes('too large')) {
          errorMessage = 'File too large - maximum size is 2GB';
        }
        
        updateFileStatus(file, 'error', 0, `Attempt ${attempt}/${retries}: ${errorMessage}`);
        
        if (attempt < retries) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Exponential backoff, max 10s
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          const finalError = `Upload failed after ${retries} attempts: ${errorMessage}`;
          setUploadErrors(prev => [...prev, finalError]);
          throw new Error(finalError);
        }
      }
    }
  };

  const uploadFile = async (file: File): Promise<void> => {
    try {
      // Try presigned URL first, fallback to server proxy on CORS errors
      try {
        await uploadViaPresignedUrl(file);
      } catch (error: any) {
        console.warn('Presigned URL upload failed, trying server proxy:', error.message);
        
        // Fallback to server proxy for CORS or other presigned URL issues
        if (error.message.includes('CORS') || error.message.includes('timeout') || error.message.includes('Access Denied')) {
          await uploadViaServerProxy(file);
        } else {
          throw error;
        }
      }
      
      updateFileStatus(file, 'success', 100);
      onUploadComplete({ fileName: file.name, fileSize: file.size });
    } catch (error: any) {
      console.error('Upload failed:', error);
      updateFileStatus(file, 'error', 0, error.message);
      throw error;
    }
  };

  const uploadViaPresignedUrl = async (file: File): Promise<void> => {
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
  };

  const uploadViaServerProxy = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    formData.append('serviceCategory', serviceCategory);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
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
          reject(new Error(`Server proxy upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Server proxy upload failed'));
      };

      xhr.open('POST', `/api/job-cards/${jobCardId}/files/upload-proxy`);
      xhr.send(formData);
    });
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

  const updateFileStatus = (file: File, status: 'uploading' | 'success' | 'error' | 'retrying', progress: number, error?: string) => {
    setUploadingFiles(prev => 
      prev.map(uf => 
        uf.file.name === file.name 
          ? { ...uf, status, progress, error, retryCount: status === 'retrying' ? (uf.retryCount || 0) + 1 : uf.retryCount }
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
                Max file size: 2GB • Supported: Images, Videos, PDFs, RAW files (DNG, CR2, NEF, ARW), ZIP files
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.zip,.tiff,.dng,.cr2,.nef,.arw"
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
                  
                  {(uploadingFile.status === 'uploading' || uploadingFile.status === 'retrying') && (
                    <div className="flex items-center gap-2">
                      <Progress value={uploadingFile.progress} className="flex-1" />
                      <span className="text-xs text-gray-500">
                        {uploadingFile.progress}%
                      </span>
                      {uploadingFile.status === 'retrying' && (
                        <Badge variant="outline" className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Retry {uploadingFile.retryCount || 1}
                        </Badge>
                      )}
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
                
                {(uploadingFile.status === 'uploading' || uploadingFile.status === 'retrying') && (
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