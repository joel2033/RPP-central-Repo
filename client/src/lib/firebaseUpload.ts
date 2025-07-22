import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { apiRequest } from "./queryClient";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface FirebaseUploadResult {
  downloadUrl: string;
  firebasePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export const uploadFileToFirebase = async (
  file: File,
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (progress: UploadProgress) => void
): Promise<FirebaseUploadResult> => {
  try {
    // Try Firebase SDK upload first
    console.log(`🚀 Attempting Firebase SDK upload for ${file.name} (${file.size} bytes)`);
    
    const prepareResponse = await apiRequest('POST', `/api/jobs/${jobId}/upload`, {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category: 'photography',
      mediaType: mediaType
    });

    if (!prepareResponse.firebasePath) {
      throw new Error('Upload failed: No Firebase path returned from backend.');
    }

    const { firebasePath } = prepareResponse;
    const storageRef = ref(storage, firebasePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round(progress),
            });
          }
          console.log(`Upload progress: ${Math.round(progress)}%`);
        },
        (error) => {
          console.error('Firebase upload error - Full details:', JSON.stringify(error, null, 2));
          console.error('Firebase upload error - Error object keys:', Object.keys(error));
          console.error('Firebase upload error - Error code:', error.code);
          console.error('Firebase upload error - Error message:', error.message);
          console.error('Firebase upload error - Error name:', error.name);
          reject(new Error(`Upload failed: ${error.message || error.code || 'Unknown Firebase error'}`));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            await apiRequest('POST', `/api/jobs/${jobId}/process-file`, {
              firebasePath,
              downloadUrl,
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              category: 'photography',
              mediaType: mediaType
            });

            resolve({
              downloadUrl,
              firebasePath,
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type
            });
          } catch (error) {
            console.error('Error finalizing upload with backend:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Failed to upload file to Firebase - Full details:', JSON.stringify(error, null, 2));
    console.error('Failed to upload file to Firebase - Error type:', typeof error);
    console.error('Failed to upload file to Firebase - Error object keys:', Object.keys(error as any));
    
    // Try server-side FormData upload as fallback
    console.log('🔄 Falling back to server-side upload with FormData');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('contentType', file.type);
      formData.append('fileSize', file.size.toString());
      formData.append('category', 'photography');
      formData.append('mediaType', mediaType);
      
      console.log('📤 Sending FormData to server:', {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        category: 'photography',
        mediaType: mediaType
      });
      
      const response = await fetch(`/api/jobs/${jobId}/upload-file`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server upload failed:', response.status, errorText);
        throw new Error(`Server upload failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Server upload successful:', result);
      
      return {
        downloadUrl: result.downloadUrl,
        firebasePath: result.firebasePath,
        fileName: result.fileName,
        fileSize: result.fileSize || file.size,
        contentType: result.contentType || file.type
      };
    } catch (serverError) {
      console.error('Server upload also failed:', serverError);
      throw new Error(`Both Firebase SDK and server upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

export const uploadMultipleFilesToFirebase = async (
  files: File[],
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (fileName: string, progress: UploadProgress) => void
): Promise<FirebaseUploadResult[]> => {
  const results: FirebaseUploadResult[] = [];

  for (const file of files) {
    try {
      const result = await uploadFileToFirebase(
        file,
        jobId,
        mediaType,
        (progress) => {
          if (onProgress) {
            onProgress(file.name, progress);
          }
        }
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error);
      throw error;
    }
  }

  return results;
};