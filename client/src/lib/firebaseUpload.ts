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
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
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
    const app = getFirebaseApp();
    const storage = getStorage(app);
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
              progress: Math.round(progress)
            });
          }
          console.log(`Upload progress: ${Math.round(progress)}%`);
        },
        (error) => {
          console.error('Firebase upload error:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            name: error.name,
            customData: error.customData
          });
          reject(new Error(`Upload failed: ${error.message || error.code || 'Unknown Firebase error'}`));
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