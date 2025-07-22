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
  // 10-minute timeout for individual file uploads
  const individualTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Individual file upload timeout: ${file.name} exceeded 10 minutes`));
    }, 600000); // 10 minutes
  });

  const uploadPromise = async (): Promise<FirebaseUploadResult> => {
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
      
      // Log FormData entries for debugging
      console.log('FormData entries:', Object.fromEntries(formData.entries()));
      
      // Use XMLHttpRequest for better timeout and progress control
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/jobs/${jobId}/upload-file`);
        xhr.timeout = 300000; // 5 minute timeout for large files
        
        xhr.ontimeout = () => {
          console.error('Upload timeout for', file.name);
          reject(new Error('Upload timed out after 5 minutes'));
        };
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress({
              bytesTransferred: e.loaded,
              totalBytes: e.total,
              progress: progress
            });
            console.log(`Server upload progress: ${progress}%`);
          }
        };
        
        xhr.onload = () => {
          console.log('Server response status:', xhr.status);
          console.log('Server response text:', xhr.responseText);
          
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log('✅ Server upload successful:', result);
              
              if (!result.success) {
                reject(new Error(result.error || 'Server upload failed without success flag'));
              } else {
                resolve(result);
              }
            } catch (parseError) {
              console.error('Failed to parse server response:', parseError);
              reject(new Error(`Failed to parse server response: ${xhr.responseText}`));
            }
          } else {
            console.error('Upload failed status:', xhr.status, xhr.responseText);
            reject(new Error(`Server upload failed: ${xhr.status} - ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = (err) => {
          console.error('XHR network error:', err);
          reject(new Error('Network error during upload'));
        };
        
        xhr.onabort = () => {
          console.warn('XHR upload canceled for', file.name);
          reject(new Error('Upload canceled'));
        };
        
        console.log('📤 Starting XMLHttpRequest upload...');
        xhr.send(formData);
      });
      
      console.log('XMLHttpRequest upload completed:', result);
      
      return {
        downloadUrl: result.downloadUrl,
        firebasePath: result.firebasePath,
        fileName: result.fileName,
        fileSize: result.fileSize || file.size,
        contentType: result.contentType || file.type
      };
    } catch (serverError) {
      console.error('Server upload also failed:', serverError);
      const serverErrorMessage = serverError instanceof Error ? serverError.message : 'Unknown server error';
      const originalErrorMessage = error instanceof Error ? error.message : 'Unknown Firebase error';
      throw new Error(`Both Firebase SDK and server upload failed. Firebase: ${originalErrorMessage}, Server: ${serverErrorMessage}`);
    }
  };

  try {
    return await Promise.race([uploadPromise(), individualTimeout]);
  } catch (error) {
    console.error(`Upload failed for ${file.name}:`, error);
    throw error;
  }
};

export const uploadMultipleFilesToFirebase = async (
  files: File[],
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (fileName: string, progress: UploadProgress) => void
): Promise<FirebaseUploadResult[]> => {
  console.log(`🚀 Starting parallel upload of ${files.length} files`);

  // Use Promise.allSettled for parallel uploads that handle individual failures
  const uploadPromises = files.map(file => 
    uploadFileToFirebase(
      file, 
      jobId, 
      mediaType, 
      (progress) => {
        if (onProgress) {
          onProgress(file.name, progress);
        }
      }
    )
  );

  // 10-minute overall timeout for the entire batch
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Batch upload timeout: exceeded 10 minutes'));
    }, 600000); // 10 minutes
  });

  try {
    const results = await Promise.race([
      Promise.allSettled(uploadPromises),
      timeoutPromise
    ]);

    const successfulResults: FirebaseUploadResult[] = [];
    const failedFiles: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
        console.log(`✅ Successfully uploaded: ${files[index].name}`);
      } else {
        failedFiles.push(files[index].name);
        console.error(`❌ File upload failed: ${files[index].name}`, result.reason);
      }
    });

    if (failedFiles.length > 0) {
      console.warn(`⚠️ ${failedFiles.length} files failed to upload:`, failedFiles);
    }

    console.log(`📊 Batch complete: ${successfulResults.length}/${files.length} files uploaded`);
    return successfulResults;

  } catch (error) {
    console.error('Batch upload failed:', error);
    throw error;
  }
};