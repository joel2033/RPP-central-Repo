import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface FirebaseFileUploadProps {
  jobCardId: number;
  onUploadSuccess: () => void;
  mediaType?: 'raw' | 'finished';
  serviceCategory?: string;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  authDomain: "rpp-central-database.firebaseapp.com",
  projectId: "rpp-central-database",
  storageBucket: "rpp-central-database.appspot.com",
  messagingSenderId: "308973286016",
  appId: "1:308973286016:web:dd689d8c6ea79713242c65",
  measurementId: "G-2WHBQW1QES"
};

export const FirebaseFileUpload: React.FC<FirebaseFileUploadProps> = ({
  jobCardId,
  onUploadSuccess,
  mediaType = 'finished',
  serviceCategory = 'photography',
  disabled = false,
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Initialize Firebase
  const getFirebaseApp = () => {
    if (getApps().length === 0) {
      return initializeApp(firebaseConfig);
    }
    return getApps()[0];
  };

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
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff',
      'image/x-adobe-dng', 'image/x-canon-cr2', 'image/x-canon-crw',
      'image/x-nikon-nef', 'image/x-sony-arw', 'image/x-panasonic-raw',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/mov',
      'application/pdf', 'application/zip', 'application/x-zip-compressed',
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
        toast({
          title: "Invalid File",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "Please select valid files for upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    // Initialize uploading files state
    const uploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));
    setUploadingFiles(uploadingFiles);

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        await uploadSingleFile(file, i);
      }

      toast({
        title: "Upload Successful",
        description: `${validFiles.length} file(s) uploaded successfully.`,
      });

      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
    }
  };

  const uploadSingleFile = async (file: File, index: number) => {
    try {
      console.log(`🚀 Starting Firebase upload for: ${file.name}`);

      // Update progress
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 10 } : item
        )
      );

      // Generate Firebase path
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const firebasePath = `jobs/${jobCardId}/${mediaType}/${timestamp}-${cleanFileName}`;

      // Initialize Firebase and upload
      const app = getFirebaseApp();
      const storage = getStorage(app);
      const storageRef = ref(storage, firebasePath);

      // Update progress
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 30 } : item
        )
      );

      // Upload file to Firebase
      const uploadResult = await uploadBytes(storageRef, file, {
        contentType: file.type
      });

      // Update progress
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 60 } : item
        )
      );

      // Get download URL
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      console.log(`✅ Firebase upload complete: ${file.name}`);

      // Update progress
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 80, status: 'processing' } : item
        )
      );

      // Process the uploaded file on the server
      await apiRequest('POST', `/api/jobs/${jobCardId}/process-file`, {
        firebasePath,
        downloadUrl,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        category: serviceCategory,
        mediaType
      });

      // Update progress to complete
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 100, status: 'complete' } : item
        )
      );

      console.log(`✅ File processing complete: ${file.name}`);

    } catch (error) {
      console.error(`❌ Upload failed for ${file.name}:`, error);
      
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { 
            ...item, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed'
          } : item
        )
      );
      
      throw error;
    }
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
          accept=".jpg,.jpeg,.png,.gif,.webp,.tiff,.dng,.cr2,.crw,.nef,.arw,.mp4,.mov,.avi,.pdf,.zip"
        />
        
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-gray-500">
          Supports: RAW (.dng), JPEG, PNG, MP4, ZIP files up to 2GB
        </p>
        {mediaType === 'raw' && (
          <p className="text-xs text-blue-600 mt-1">
            Uploading RAW files for processing
          </p>
        )}
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="font-medium text-gray-700">
            Uploading {uploadingFiles.length} file(s)...
          </h3>
          
          {uploadingFiles.map((item, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {item.file.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {item.status === 'uploading' && 'Uploading...'}
                      {item.status === 'processing' && 'Processing...'}
                      {item.status === 'complete' && 'Complete'}
                      {item.status === 'error' && 'Error'}
                    </span>
                    {item.status !== 'complete' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadingFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Progress 
                  value={item.progress} 
                  className={`h-2 ${
                    item.status === 'error' ? 'bg-red-200' : 
                    item.status === 'complete' ? 'bg-green-200' : ''
                  }`}
                />
                
                {item.error && (
                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};