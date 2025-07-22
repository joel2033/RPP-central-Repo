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
              console.error('SDK upload error code:', err.code, 'serverResponse:', err.serverResponse, 'customData:', err.customData);
              console.error('Firebase upload error - Full details:', JSON.stringify(err, null, 2));
              console.error('Firebase upload error - Error object keys:', Object.keys(err));
              reject(err);
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
      
      // Log serverResponse if available for empty errors
      if (error && typeof error === 'object' && 'serverResponse' in error) {
        console.error('Firebase SDK serverResponse:', (error as any).serverResponse);
      }
      
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
        
        // Try chunked upload for large files (>5MB)
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        if (file.size > CHUNK_SIZE) {
          console.log(`📊 Large file detected (${file.size} bytes), using chunked upload`);
          return await uploadFileInChunks(file, jobId, mediaType, onProgress);
        }
        
        let result;
        let retries = 3;
        
        while (retries > 0) {
          try {
            // Use XMLHttpRequest with retry logic
            result = await new Promise<any>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', `/api/jobs/${jobId}/upload-file`);
              xhr.timeout = 900000; // 15 min for large RAW files
              
              xhr.ontimeout = () => {
                console.error('Upload timeout for', file.name);
                reject(new Error('Upload timed out after 15 minutes'));
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
                    
                    if (!result || !result.firebasePath) {
                      reject(new Error('Invalid response format - missing firebasePath'));
                    } else if (!result.success) {
                      reject(new Error(result.error || 'Server upload failed without success flag'));
                    } else {
                      resolve(result);
                    }
                  } catch (parseError) {
                    console.error('Failed to parse server response:', parseError);
                    reject(new Error(`Failed to parse server response: ${xhr.responseText}`));
                  }
                } else {
                  reject(new Error(`Status ${xhr.status}: ${xhr.responseText}`));
                }
              };
              
              xhr.onerror = (err) => {
                console.error('XHR network error:', err);
                reject(new Error('Network error during upload'));
              };
              
              xhr.onabort = () => {
                console.error('Upload aborted, retrying...', retries);
                if (retries > 1) {
                  reject(new Error('Upload aborted - retrying'));
                } else {
                  reject(new Error('Upload aborted after retries'));
                }
              };
              
              console.log(`📤 Starting XMLHttpRequest upload (attempt ${4 - retries}/3)...`);
              xhr.send(formData);
            });
            
            // Success, exit retry loop
            break;
            
          } catch (xhrError) {
            retries--;
            console.error(`XHR upload failed (${retries} retries left):`, xhrError);
            
            if (retries <= 0) {
              throw xhrError;
            }
            
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
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
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  console.log(`🧩 Starting chunked upload for ${file.name}: ${totalChunks} chunks of ${CHUNK_SIZE} bytes`);
  
  // Get signed URL from server
  try {
    const signedUrlResponse = await fetch(`/api/jobs/${jobId}/generate-signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      })
    });
    
    if (!signedUrlResponse.ok) {
      throw new Error(`Failed to get signed URL: ${signedUrlResponse.status}`);
    }
    
    const { signedUrl, filePath } = await signedUrlResponse.json();
    console.log(`🔑 Got signed URL for chunked upload: ${filePath}`);
    
    // Set up overall timeout with AbortController
    const controller = new AbortController();
    const overallTimeoutId = setTimeout(() => {
      controller.abort();
    }, 900000); // 15 minutes total timeout
    
    let uploadedBytes = 0;
    
    try {
      // Upload chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        console.log(`📦 Uploading chunk ${chunkIndex + 1}/${totalChunks} (${start}-${end})`);
        
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signedUrl);
          xhr.timeout = 120000; // 2 minutes per chunk
          
          // Set Content-Range header for resumable upload
          xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${file.size}`);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.setRequestHeader('X-Goog-Content-Length-Range', `0,${file.size}`);
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const chunkProgress = e.loaded;
              const totalProgress = uploadedBytes + chunkProgress;
              const overallProgress = Math.round((totalProgress / file.size) * 100);
              
              if (onProgress) {
                onProgress({
                  bytesTransferred: totalProgress,
                  totalBytes: file.size,
                  progress: overallProgress
                });
              }
              
              console.log(`🔄 Chunk ${chunkIndex + 1} progress: ${Math.round((chunkProgress / chunk.size) * 100)}%, Overall: ${overallProgress}%`);
            }
          };
          
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 308) { // 308 = Resume Incomplete
              uploadedBytes += chunk.size;
              console.log(`✅ Chunk ${chunkIndex + 1} uploaded successfully`);
              resolve();
            } else {
              reject(new Error(`Chunk upload failed: ${xhr.status} - ${xhr.responseText}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error(`Network error during chunk ${chunkIndex + 1} upload`));
          };
          
          xhr.ontimeout = () => {
            reject(new Error(`Chunk ${chunkIndex + 1} upload timed out`));
          };
          
          xhr.onabort = () => {
            reject(new Error(`Chunk ${chunkIndex + 1} upload aborted`));
          };
          
          xhr.send(chunk);
        });
        
        // Check if overall upload was aborted
        if (controller.signal.aborted) {
          throw new Error('Overall upload timeout after 15 minutes');
        }
      }
      
      clearTimeout(overallTimeoutId);
      console.log(`🎉 All ${totalChunks} chunks uploaded successfully`);
      
      // Get download URL using Firebase SDK
      const { storage } = await import('./firebase');
      const { ref, getDownloadURL } = await import('firebase/storage');
      const fileRef = ref(storage, filePath);
      const downloadUrl = await getDownloadURL(fileRef);
      
      console.log(`📥 Got download URL for chunked upload: ${downloadUrl}`);
      
      return {
        downloadUrl,
        firebasePath: filePath,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      };
      
    } catch (chunkError) {
      clearTimeout(overallTimeoutId);
      console.error('Chunked upload failed:', chunkError);
      throw chunkError;
    }
    
  } catch (error) {
    console.error('Failed to initialize chunked upload:', error);
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