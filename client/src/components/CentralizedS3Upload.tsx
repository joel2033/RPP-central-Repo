import React from 'react';
import { FirebaseFileUpload } from './FirebaseFileUpload';

interface CentralizedS3UploadProps {
  jobCardId: number;
  onUploadSuccess: () => void;
}

export const CentralizedS3Upload: React.FC<CentralizedS3UploadProps> = ({
  jobCardId,
  onUploadSuccess
}) => {
  return (
    <FirebaseFileUpload
      jobCardId={jobCardId}
      onUploadSuccess={onUploadSuccess}
      mediaType="finished"
      serviceCategory="photography"
    />
  );
};