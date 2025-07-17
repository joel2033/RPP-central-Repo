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
import { useToast } from '@/hooks/use-toast';

interface JPEGFileUploadProps {
  jobCardId: number;
  contentId?: string;
  onUploadComplete: (fileData: any) => void;
  onUploadError?: (error: string) => void;
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

export const JPEGFileUpload: React.FC<JPEGFileUploadProps> = ({
  jobCardId,
  contentId,
  onUploadComplete,
  onUploadError,
  serviceCategory = 'photography',
  disabled = false,
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

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

  const validateJPEGFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const allowedTypes = ['image/jpeg', 'image/jpg'];
    const allowedExtensions = ['.jpg', '.jpeg'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 2GB limit' };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { valid: false, error: 'Only JPEG finished files are allowed' };
    }

    // Check file extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
      return { valid: false, error: 'Only JPEG finished files are allowed' };
    }

    return { valid: true };
  };

  const handleFileSelection = async (files: File[]) => {
    if (files.length === 0) return;

    // Validate files - only JPEG allowed
    const validFiles = files.filter(file => {
      const validation = validateJPEGFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid File Type",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        });
        onUploadError?.(`${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "Please select JPEG files only for finished content.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setIsModalOpen(true);
    
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
      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successful} JPEG file(s)${failed > 0 ? ` (${failed} failed)` : ''}`,
        });
        onUploadComplete(validFiles);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: "Some files failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setIsModalOpen(false), 2000); // Auto-close after 2 seconds
    }
  };

  const uploadFileWithRetry = async (file: File, retries = 3): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        updateFileStatus(file, attempt > 1 ? 'retrying' : 'uploading', 0);
        await uploadFile(file);
        updateFileStatus(file, 'success', 100);
        return;
      } catch (error) {
        console.error(`Upload attempt ${attempt} failed for ${file.name}:`, error);
        
        if (attempt === retries) {
          updateFileStatus(file, 'error', 0, `Upload failed after ${retries} attempts`);
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  const uploadFile = async (file: File): Promise<void> => {
    try {
      // Try presigned URL first
      await uploadViaPresignedUrl(file);
    } catch (error) {
      console.warn('Presigned URL upload failed, trying server proxy:', error);
      // Fallback to server proxy
      await uploadViaServerProxy(file);
    }
  };

  const uploadViaPresignedUrl = async (file: File): Promise<void> => {
    // Step 1: Get presigned upload URL
    const uploadUrlResponse = await apiRequest('POST', `/api/job-cards/${jobCardId}/files/upload-url`, {
      fileName: file.name,
      contentType: file.type,
      mediaType: 'final', // This determines S3 tags: 'final' → type:finished
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
      mediaType: 'final',
      serviceCategory,
      contentId
    });
  };

  const uploadViaServerProxy = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', 'final');
    formData.append('serviceCategory', serviceCategory);
    if (contentId) {
      formData.append('contentId', contentId);
    }

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          updateFileStatus(file, 'uploading', progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
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
          reject(new Error(`S3 upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = (event) => {
        reject(new Error(`S3 upload network error: ${event.type}`));
      };

      xhr.ontimeout = () => {
        reject(new Error('S3 upload timed out'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.timeout = 60000; // 60 second timeout
      xhr.send(file);
    });
  };

  const updateFileStatus = (file: File, status: 'uploading' | 'success' | 'error' | 'retrying', progress: number, error?: string) => {
    setUploadingFiles(prev => prev.map(f => 
      f.file.name === file.name 
        ? { ...f, status, progress, error }
        : f
    ));
  };

  return (
    <>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,image/jpeg"
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <Upload className="h-8 w-8 text-gray-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Upload JPEG Files</h3>
            <p className="text-sm text-gray-600">
              Drag and drop JPEG files here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              Only JPEG finished files are allowed (Max 2GB per file)
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="mt-4"
          >
            Choose JPEG Files
          </Button>
        </div>
      </div>

      {/* Upload Progress Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uploading JPEG Files</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {uploadingFiles.map((uploadingFile, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium truncate">{uploadingFile.file.name}</span>
                    <div className="flex items-center gap-2">
                      {uploadingFile.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {uploadingFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadingFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {uploadingFile.status === 'retrying' && (
                        <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
                      )}
                      <Badge variant={
                        uploadingFile.status === 'success' ? 'default' :
                        uploadingFile.status === 'error' ? 'destructive' :
                        uploadingFile.status === 'retrying' ? 'secondary' :
                        'outline'
                      }>
                        {uploadingFile.status}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={uploadingFile.progress} className="mb-2" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{Math.round(uploadingFile.file.size / 1024 / 1024 * 100) / 100} MB</span>
                    <span>{uploadingFile.progress}%</span>
                  </div>
                  {uploadingFile.error && (
                    <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {uploadingFile.error}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};