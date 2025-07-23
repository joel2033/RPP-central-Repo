import { storage, auth } from './firebase';
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
    // Authentication check - required for uploads
    if (!auth.currentUser) {
      throw new Error('Authentication required - please sign in before uploading files');
    }
    
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
      
      try {
        const storageRef = ref(storage, firebasePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const uploadPromise = new Promise((resolve, reject) => {
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
            (err) => {
              console.error('SDK error:', { 
                code: err.code, 
                message: err.message, 
                customData: err.customData,
                serverResponse: err.serverResponse 
              });
              
              // Enhanced error handling for specific cases
              if (err.code === 'storage/unauthorized') {
                reject(new Error('Auth failed - re-login required'));
              } else if (err.code === 'storage/retry-limit-exceeded') {
                reject(new Error('Upload timeout - trying chunked upload'));
              } else {
                // Handle empty error objects better
                const errorCode = err.code || 'unknown';
                const errorMessage = err.message || 'Empty error object';
                reject(new Error(`SDK error: ${errorCode} - ${errorMessage}`));
              }
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

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('SDK upload timeout after 10 minutes'));
          }, 600000); // 10 minutes
        });

        return await Promise.race([uploadPromise, timeoutPromise]) as FirebaseUploadResult;
      } catch (sdkError: any) {
        console.error('SDK catch:', sdkError?.code, sdkError?.message);
        throw sdkError;
      }
    } catch (error) {
      console.error('Failed to upload file to Firebase - Full details:', JSON.stringify(error, null, 2));
      console.error('Failed to upload file to Firebase - Error type:', typeof error);
      console.error('Failed to upload file to Firebase - Error object keys:', Object.keys(error as any));
      
      // Log serverResponse and customData if available for empty errors
      if (error && typeof error === 'object') {
        if ('serverResponse' in error) {
          console.error('Firebase SDK serverResponse:', (error as any).serverResponse);
        }
        if ('customData' in error) {
          console.error('Firebase SDK customData:', (error as any).customData);
        }
      }
      
      // Use server-side upload directly - bypassing XHR network issues
      console.log('🔄 Using direct server-side upload via fetch API');
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
        
        // Try chunked upload for large files (>5MB)
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        if (file.size > CHUNK_SIZE) {
          console.log(`📊 Large file detected (${file.size} bytes), using chunked upload`);
          return await uploadFileInChunks(file, jobId, mediaType, onProgress);
        }
        
        let result;
        let retries = 3;
        let delay = 1000; // Start with 1 second delay
        
        while (retries > 0) {
          try {
            // Use fetch API instead of XMLHttpRequest to avoid network issues
            console.log(`📤 Uploading ${file.name} via fetch API (attempt ${4 - retries}/3)`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 min timeout
            
            const response = await fetch(`/api/jobs/${jobId}/upload-file`, {
              method: 'POST',
              body: formData,
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`Server upload failed: ${response.status} ${response.statusText}`);
            }
            
            result = await response.json();
            console.log('✅ Fetch upload successful:', result);
            
            if (!result || !result.success) {
              throw new Error(result?.error || 'Server upload failed without success flag');
            }
            
            // Transform to expected format
            const transformedResult = {
              downloadUrl: result.downloadUrl,
              firebasePath: result.firebasePath,
              fileName: result.fileName || file.name,
              fileSize: result.fileSize || file.size,
              contentType: file.type
            };
            
            console.log('✅ File uploaded successfully via server:', transformedResult);
            return transformedResult;
            
          } catch (fetchError) {
            console.error(`Fetch upload attempt ${4 - retries} failed:`, fetchError);
            retries--;
            
            if (retries > 0) {
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
            } else {
              throw fetchError;
            }
          }
        }
        
        // This should never be reached due to return statements above
        throw new Error('Upload method reached unexpected end');

      } catch (serverError) {
        console.error('Server upload also failed, trying chunked upload:', serverError);
        
        // Try chunked upload as final fallback
        try {
          return await uploadFileInChunks(file, jobId, mediaType, onProgress);
        } catch (chunkError) {
          console.error('Chunked upload also failed:', chunkError);
          const serverErrorMessage = serverError instanceof Error ? serverError.message : 'Unknown server error';
          const originalErrorMessage = error instanceof Error ? error.message : 'Unknown Firebase error';
          const chunkErrorMessage = chunkError instanceof Error ? chunkError.message : 'Unknown chunk error';
          throw new Error(`All upload methods failed. Firebase: ${originalErrorMessage}, Server: ${serverErrorMessage}, Chunked: ${chunkErrorMessage}`);
        }
      }
    }
  };

  try {
    return await Promise.race([uploadPromise(), individualTimeout]);
  } catch (error) {
    console.error(`Failed to upload file ${file.name}:`, error);
    throw error;
  }
};

// Chunked upload function for large files
const uploadFileInChunks = async (
  file: File,
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (progress: UploadProgress) => void
): Promise<FirebaseUploadResult> => {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const chunks = [];
  
  // Split file into chunks
  for (let start = 0; start < file.size; start += chunkSize) {
    chunks.push(file.slice(start, start + chunkSize));
  }
  
  console.log(`Starting chunked upload for ${file.name}: ${chunks.length} chunks of ${chunkSize} bytes`);
  
  let uploadedBytes = 0;
  
  try {
    // Upload chunks sequentially with Content-Range headers
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkStart = uploadedBytes;
      const chunkEnd = uploadedBytes + chunk.size - 1;
      
      console.log(`Uploading chunk ${i + 1}/${chunks.length}: bytes ${chunkStart}-${chunkEnd}/${file.size}`);
      
      await new Promise<void>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', new Blob([chunk], { type: file.type }), file.name);
        formData.append('fileName', file.name);
        formData.append('contentType', file.type);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/jobs/${jobId}/upload-file-chunk`, true);
        xhr.setRequestHeader('Content-Range', `bytes ${chunkStart}-${chunkEnd}/${file.size}`);
        xhr.setRequestHeader('X-File-Name', file.name);
        xhr.timeout = 300000; // 5 minutes per chunk
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const totalProgress = Math.round(((uploadedBytes + e.loaded) / file.size) * 100);
            onProgress({
              bytesTransferred: uploadedBytes + e.loaded,
              totalBytes: file.size,
              progress: totalProgress
            });
          }
        };
        
        xhr.onloadend = () => {
          if (xhr.status === 200) {
            console.log(`Chunk ${i + 1} uploaded successfully`);
            resolve();
          } else {
            console.error(`Chunk ${i + 1} failed with status ${xhr.status}: ${xhr.responseText}`);
            reject(new Error(`Chunk upload failed: ${xhr.status} ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => {
          console.error(`Network error uploading chunk ${i + 1}`);
          reject(new Error(`Network error uploading chunk ${i + 1}`));
        };
        
        xhr.ontimeout = () => {
          console.error(`Timeout uploading chunk ${i + 1}`);
          reject(new Error(`Timeout uploading chunk ${i + 1}`));
        };
        
        xhr.send(formData);
      });
      
      uploadedBytes += chunk.size;
    }
    
    // All chunks uploaded successfully - server handles finalization automatically
    console.log(`All chunks uploaded for ${file.name} successfully`);
    
    // The server automatically finalizes on the last chunk, so we just return success
    return {
      downloadUrl: '', // Will be provided by server in last chunk response
      firebasePath: `temp_uploads/${jobId}/${file.name}`,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type
    };
    
  } catch (error) {
    console.error('Chunked upload failed:', error);
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