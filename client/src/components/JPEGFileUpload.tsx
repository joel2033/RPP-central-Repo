import React from 'react';
import { FirebaseFileUpload } from './FirebaseFileUpload';

interface JPEGFileUploadProps {
  jobCardId: number;
  contentId?: string;
  onUploadComplete: (fileData: any) => void;
  onUploadError?: (error: string) => void;
  serviceCategory?: string;
  disabled?: boolean;
  className?: string;
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
  return (
    <FirebaseFileUpload
      jobCardId={jobCardId}
      onUploadSuccess={onUploadComplete}
      mediaType="finished"
      serviceCategory={serviceCategory}
      disabled={disabled}
      className={className}
    />
  );
};