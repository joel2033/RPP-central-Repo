import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CentralizedS3UploadProps {
  jobCardId: number;
  onUploadSuccess: () => void;
}

export const CentralizedS3Upload: React.FC<CentralizedS3UploadProps> = ({
  jobCardId,
  onUploadSuccess
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        console.log(`🚀 Starting upload for: ${file.name} (${file.size} bytes)`);

        // Step 1: Get upload URL and metadata
        const uploadData = await apiRequest('POST', `/api/jobs/${jobCardId}/upload-file`, {
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          category: 'photography', // Default category
          mediaType: 'finished'
        });

        console.log(`✅ Got upload URL for: ${file.name}`);

        // Step 2: Upload file to S3 using presigned URL
        const uploadResponse = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        console.log(`✅ File uploaded to S3: ${file.name}`);

        // Step 3: Process the uploaded file (generate thumbnail, save metadata)
        const processResult = await apiRequest('POST', `/api/jobs/${jobCardId}/process-file`, {
          s3Key: uploadData.s3Key,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          category: 'photography',
          mediaType: 'finished'
        });

        console.log(`✅ File processing complete: ${file.name}`, processResult);

        console.log(`✅ Successfully uploaded and processed: ${file.name}`);
      }

      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded with thumbnails generated.`,
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
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isUploading ? 'Uploading...' : 'Click to upload images'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPG files up to 2GB
          </p>
        </label>
      </div>
      
      {isUploading && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Processing uploads...</span>
        </div>
      )}
    </div>
  );
};