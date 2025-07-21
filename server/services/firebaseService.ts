import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import promiseRetry from 'promise-retry';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export class FirebaseStorageService {
  private app: FirebaseApp;
  private storage: FirebaseStorage;

  constructor(config: FirebaseConfig) {
    console.log('Firebase Storage initializing with bucket:', config.storageBucket);
    
    // Initialize Firebase App if not already initialized
    if (getApps().length === 0) {
      this.app = initializeApp(config);
    } else {
      this.app = getApps()[0];
    }
    
    this.storage = getStorage(this.app);
  }

  // Upload file to Firebase Storage with retry logic
  async uploadFile(
    jobId: number,
    fileName: string,
    buffer: Buffer,
    mediaType: 'raw' | 'finished',
    contentType: string
  ): Promise<{ firebasePath: string; downloadUrl: string }> {
    const firebasePath = `jobs/${jobId}/${mediaType}/${fileName}`;
    
    console.log(`Firebase upload starting:`, {
      firebasePath,
      contentType,
      bufferSize: buffer.length,
      mediaType
    });

    return promiseRetry(async (retry, attempt) => {
      try {
        const storageRef = ref(this.storage, firebasePath);
        
        // Upload the file
        const uploadResult = await uploadBytes(storageRef, buffer, {
          contentType: contentType
        });
        
        // Get download URL
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        
        console.log(`✓ Successfully uploaded ${fileName} to Firebase on attempt ${attempt}`);
        
        return {
          firebasePath,
          downloadUrl
        };
      } catch (error: any) {
        console.error(`✗ Upload attempt ${attempt} failed for ${fileName}:`, {
          error: error.message,
          code: error.code,
          name: error.name
        });

        // Don't retry on certain errors
        if (error.code === 'storage/unauthorized') {
          throw new Error(`Firebase Storage unauthorized - check authentication`);
        }

        if (error.code === 'storage/quota-exceeded') {
          throw new Error(`Firebase Storage quota exceeded`);
        }

        if (error.code === 'storage/invalid-argument') {
          throw new Error(`Invalid file format or metadata`);
        }

        if (attempt < 5) {
          console.log(`Retrying upload for ${fileName} (attempt ${attempt + 1}/5)`);
          retry(error);
        } else {
          throw new Error(`Upload failed after 5 attempts: ${error.message}`);
        }
      }
    }, {
      retries: 4,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000
    });
  }

  // Get download URL for an existing file
  async getDownloadUrl(firebasePath: string): Promise<string> {
    try {
      const storageRef = ref(this.storage, firebasePath);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error(`Failed to get download URL for ${firebasePath}:`, error);
      throw new Error(`Could not get download URL: ${error.message}`);
    }
  }

  // Delete file from Firebase Storage
  async deleteFile(firebasePath: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, firebasePath);
      await deleteObject(storageRef);
      console.log(`✓ Successfully deleted file: ${firebasePath}`);
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.log(`File not found (already deleted): ${firebasePath}`);
        return; // Not an error if file doesn't exist
      }
      console.error(`Failed to delete file ${firebasePath}:`, error);
      throw new Error(`Could not delete file: ${error.message}`);
    }
  }

  // Generate Firebase path for file
  generateFirebasePath(jobId: number, fileName: string, mediaType: 'raw' | 'finished'): string {
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `jobs/${jobId}/${mediaType}/${timestamp}-${cleanFileName}`;
  }

  // Validate file size and type
  validateFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/x-adobe-dng',
      'image/x-canon-cr2',
      'image/x-canon-crw',
      'image/x-nikon-nef',
      'image/x-sony-arw',
      'image/x-panasonic-raw',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/avi',
      'video/mov',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 2GB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  }

  // Download file as buffer from Firebase Storage (for thumbnail generation)
  async downloadFile(firebasePath: string): Promise<Buffer> {
    console.log(`Downloading file from Firebase Storage: ${firebasePath}`);
    
    try {
      const storageRef = ref(this.storage, firebasePath);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Fetch the file using the download URL
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`✓ Successfully downloaded file: ${firebasePath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error: any) {
      console.error(`Failed to download file ${firebasePath}:`, error);
      throw new Error(`Could not download file: ${error.message}`);
    }
  }

  // Upload buffer directly to Firebase Storage (for thumbnails)
  async uploadBuffer(
    firebasePath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    console.log(`Uploading buffer to Firebase Storage: ${firebasePath} (${buffer.length} bytes)`);

    try {
      const storageRef = ref(this.storage, firebasePath);
      
      const uploadResult = await uploadBytes(storageRef, buffer, {
        contentType: contentType
      });
      
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      console.log(`✅ Buffer uploaded successfully: ${firebasePath}`);
      return downloadUrl;
    } catch (error: any) {
      console.error(`Failed to upload buffer ${firebasePath}:`, error);
      throw new Error(`Could not upload buffer: ${error.message}`);
    }
  }
}

// Create Firebase Storage service instance
const createFirebaseStorageService = (): FirebaseStorageService | null => {
  const config = {
    apiKey: process.env.GOOGLE_API_KEY,
    authDomain: "rpp-central-database.firebaseapp.com",
    projectId: "rpp-central-database",
    storageBucket: "rpp-central-database.firebasestorage.app",
    messagingSenderId: "308973286016",
    appId: "1:308973286016:web:dd689d8c6ea79713242c65",
    measurementId: "G-2WHBQW1QES"
  };

  // Check if required API key is present
  if (!config.apiKey) {
    console.warn('Firebase configuration incomplete. Missing GOOGLE_API_KEY environment variable');
    return null;
  }

  console.log('Firebase Storage service initialized successfully with bucket:', config.storageBucket);
  return new FirebaseStorageService(config);
};

export const firebaseStorageService = createFirebaseStorageService();