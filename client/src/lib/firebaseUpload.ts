import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { apiRequest } from "./queryClient";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  authDomain: "rpp-central-database.firebaseapp.com",
  projectId: "rpp-central-database",
  storageBucket: "rpp-central-database.appspot.com",
  messagingSenderId: "308973286016",
  appId: "1:308973286016:web:dd689d8c6ea79713242c65",
  measurementId: "G-2WHBQW1QES"
};

// Initialize Firebase app
const getFirebaseApp = () => {
  console.log('🔥 Getting Firebase app...');
  console.log('🔥 Current apps count:', getApps().length);
  console.log('🔥 Firebase config:', {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'NOT SET'
  });
  
  if (getApps().length === 0) {
    console.log('🔥 Initializing new Firebase app...');
    const app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase app initialized:', app.name);
    return app;
  }
  console.log('🔥 Using existing Firebase app:', getApps()[0].name);
  return getApps()[0];
};

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

/**
 * Upload a file to Firebase Storage for a specific job
 * @param file The file to upload
 * @param jobId The job ID
 * @param mediaType Either 'raw' or 'finished'
 * @param onProgress Progress callback
 * @returns Promise with upload result
 */
export const uploadFileToFirebase = async (
  file: File,
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (progress: UploadProgress) => void
): Promise<FirebaseUploadResult> => {
  try {
    // Step 1: Prepare upload via backend API
    const prepareResponse = await apiRequest('POST', `/api/jobs/${jobId}/upload`, {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      category: 'photography', // Default category for preparation
      mediaType: mediaType
    });

    if (!prepareResponse.firebasePath) {
      throw new Error('Failed to prepare upload: No Firebase path returned');
    }

    const { firebasePath } = prepareResponse;
    console.log(`📤 Uploading to Firebase path: ${firebasePath}`);

    // Step 2: Upload directly to Firebase Storage
    console.log('🔥 Initializing Firebase for upload...');
    const app = getFirebaseApp();
    console.log('🔥 Firebase app initialized:', app ? 'SUCCESS' : 'FAILED');
    
    const storage = getStorage(app);
    console.log('🔥 Firebase storage initialized:', storage ? 'SUCCESS' : 'FAILED');
    
    const storageRef = ref(storage, firebasePath);
    console.log('🔥 Storage reference created for path:', firebasePath);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    console.log('🔥 Upload task created for file:', file.name, 'size:', file.size);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: Math.round(progress)
            });
          }
          console.log(`Upload progress: ${Math.round(progress)}%`);
        },
        (error) => {
          console.error('🚨 Firebase upload error occurred:', error);
          console.error('🚨 Error type:', typeof error);
          console.error('🚨 Error constructor:', error?.constructor?.name);
          console.error('🚨 Error details:', {
            code: error?.code || 'no code',
            message: error?.message || 'no message',
            name: error?.name || 'no name',
            customData: error?.customData || 'no customData',
            fullError: JSON.stringify(error, null, 2)
          });
          
          // Check if error is completely empty
          if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
            console.error('🚨 Empty error object detected - this suggests a network or CORS issue');
            reject(new Error('Upload failed: Empty error (likely network/CORS issue)'));
          } else {
            reject(new Error(`Upload failed: ${error.message || error.code || 'Unknown Firebase error'}`));
          }
        },
        async () => {
          try {
            // Get download URL
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`✅ File uploaded successfully: ${downloadUrl}`);

            // Step 3: Notify backend of successful upload
            const completeResponse = await apiRequest('POST', `/api/jobs/${jobId}/process-file`, {
              firebasePath,
              downloadUrl,
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              category: 'photography', // Default category
              mediaType: mediaType
            });

            console.log('✅ Upload complete notification sent to backend');

            resolve({
              downloadUrl,
              firebasePath,
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type
            });
          } catch (error) {
            console.error('Error completing upload:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Firebase Storage
 * @param files Array of files to upload
 * @param jobId The job ID
 * @param mediaType Either 'raw' or 'finished'
 * @param onProgress Progress callback for individual files
 * @returns Promise with array of upload results
 */
export const uploadMultipleFilesToFirebase = async (
  files: File[],
  jobId: string | number,
  mediaType: 'raw' | 'finished' = 'raw',
  onProgress?: (fileName: string, progress: UploadProgress) => void
): Promise<FirebaseUploadResult[]> => {
  const results: FirebaseUploadResult[] = [];
  
  // Upload files sequentially to avoid overwhelming the API
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
      console.error(`Failed to upload ${file.name}:`, error);
      throw error;
    }
  }
  
  return results;
};