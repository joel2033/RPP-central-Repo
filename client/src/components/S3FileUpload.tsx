import React from 'react';
import { FirebaseFileUpload } from './FirebaseFileUpload';

interface S3FileUploadProps {
  jobCardId: number;
  onUploadComplete: (fileData: any) => void;
  onUploadError?: (error: string) => void;
  mediaType?: string;
  serviceCategory?: string;
  disabled?: boolean;
  className?: string;
}

export const S3FileUpload: React.FC<S3FileUploadProps> = ({
  jobCardId,
  onUploadComplete,
  onUploadError,
  mediaType = 'raw',
  serviceCategory = 'photography',
  disabled = false,
  className
}) => {
  return (
    <FirebaseFileUpload
      jobCardId={jobCardId}
      onUploadSuccess={(fileData) => onUploadComplete(fileData)}
      mediaType={mediaType as 'raw' | 'finished'}
      serviceCategory={serviceCategory}
      disabled={disabled}
      className={className}
    />
  );
};