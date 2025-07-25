import { storage, auth } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getAuth } from 'firebase/auth';
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

// Signed URL upload function for direct client-to-Firebase uploads
const uploadWithSignedUrl = async (
  file: File,
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (progress: UploadProgress) => void
): Promise<FirebaseUploadResult> => {
  console.log('Using chunked upload via server for', file.name);
  
  // Refresh Firebase auth token before upload
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true); // Refresh token
    }
  } catch (authError) {
    console.warn('Firebase auth refresh failed:', authError);
  }
  
  try {
    // Upload file in chunks to server endpoint
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    let uploaded = 0;
    let downloadUrl = '';
    let firebasePath = '';
    
    console.log(`Uploading ${file.name} in ${chunks} chunks`);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('fileName', file.name);
      
      console.log(`📤 Sending chunk ${i+1}: ${chunk.size} bytes for ${file.name}`);
      
      // Add retry logic for 500 errors
      let retries = 5;
      let delay = 5000;
      let response: Response | undefined;
      
      while (retries > 0) {
        try {
          response = await fetch(`/api/jobs/${jobId}/upload-file-chunk`, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Range': `bytes ${start}-${end-1}/${file.size}`,
              'Content-Length': chunk.size.toString()
            }
          });
          
          if (response.status === 500) {
            throw new Error('Server 500 - retrying');
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chunk ${i+1} upload failed: ${response.status} - ${errorText}`);
          }
          
          break; // Success, exit retry loop
          
        } catch (err) {
          retries--;
          if (retries === 0) {
            throw err; // Final attempt failed
          }
          
          console.log(`Chunk ${i+1} failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
      
      if (!response) {
        throw new Error('Failed to get response after retries');
      }
      
      const responseText = await response.text();
      console.log(`Chunk ${i+1} response:`, responseText);
      
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      // Check if result is actually an object
      if (!result || typeof result !== 'object') {
        throw new Error(`Unexpected response format: ${typeof result}`);
      }
      
      // If this was the last chunk, we get the download URL
      if (result.downloadUrl) {
        downloadUrl = result.downloadUrl;
        firebasePath = result.firebasePath || `temp_uploads/${jobId}/${file.name}`;
      }
      
      uploaded += (end - start);
      if (onProgress) {
        onProgress({ 
          bytesTransferred: uploaded, 
          totalBytes: file.size, 
          progress: Math.round((uploaded / file.size) * 100) 
        });
      }
      console.log(`Chunk ${i+1}/${chunks} uploaded`);
    }
    
    console.log('All chunks uploaded successfully');
    
    // Ensure we have the downloadUrl and firebasePath from the last chunk
    if (!downloadUrl || !firebasePath) {
      throw new Error('Upload completed but no download URL received');
    }
    
    // Process the file on the backend
    await apiRequest('POST', `/api/jobs/${jobId}/process-file`, {
      firebasePath,
      downloadUrl,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category: 'photography',
      mediaType: mediaType
    });
    
    return { 
      downloadUrl, 
      firebasePath,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type
    };
  } catch (error) {
    console.error('Chunked upload error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

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
    // For DNG files or large files, go directly to signed URL upload
    const isDNG = file.name.toLowerCase().endsWith('.dng');
    const isLargeFile = file.size > 50 * 1024 * 1024; // 50MB
    
    if (isDNG || isLargeFile) {
      console.log(`📸 ${isDNG ? 'DNG' : 'Large'} file detected - using signed URL upload directly`);
      return await uploadWithSignedUrl(file, jobId, mediaType, onProgress);
    }
    
    // Authentication check - required for uploads
    if (!auth.currentUser) {
      throw new Error('Authentication required - please sign in before uploading files');
    }
    
    try {
      // Try Firebase SDK upload first for smaller files
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
      console.error('Firebase SDK upload failed:', error);
      console.error('Error details - Type:', typeof error);
      console.error('Error details - Keys:', error ? Object.keys(error as any) : 'null/undefined');
      console.error('Error details - String:', String(error));
      
      // Check if it's an empty error object
      const isEmptyError = error && typeof error === 'object' && Object.keys(error as any).length === 0;
      console.log('Is empty error object:', isEmptyError);
      
      // Log serverResponse and customData if available for empty errors
      if (error && typeof error === 'object') {
        if ('serverResponse' in error) {
          console.error('Firebase SDK serverResponse:', (error as any).serverResponse);
        }
        if ('customData' in error) {
          console.error('Firebase SDK customData:', (error as any).customData);
        }
      }
      
      // Always use signed URL chunked upload as fallback for empty errors or any SDK failure
      console.log('🔄 Switching to signed URL chunked upload due to SDK failure');
      
      try {
        return await uploadWithSignedUrl(file, jobId, mediaType, onProgress);
      } catch (signedUrlError) {
        console.error('Signed URL upload failed:', signedUrlError);
        throw signedUrlError;
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

// Remove old chunked upload function - replaced with signed URL approach
const uploadFileInChunks_deprecated = async (
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