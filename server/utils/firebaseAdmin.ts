import admin from 'firebase-admin';

// Initialize Firebase Admin SDK once
let isInitialized = false;

function initializeFirebaseAdmin(): admin.app.App {
  if (!isInitialized) {
    try {
      // Check if service account is provided via environment variable
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (serviceAccountJson) {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.firebasestorage.app'
          });
          console.log('✅ Firebase Admin initialized with service account');
        } catch (parseError) {
          console.error('Error parsing Firebase service account:', parseError);
          // Fall back to default credentials
          admin.initializeApp({
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.firebasestorage.app'
          });
          console.log('✅ Firebase Admin initialized with default credentials (service account parse failed)');
        }
      } else {
        // Initialize with default credentials (for environments like Google Cloud)
        admin.initializeApp({
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.firebasestorage.app'
        });
        console.log('✅ Firebase Admin initialized with default credentials');
      }
      isInitialized = true;
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error);
      throw error;
    }
  }
  
  return admin.app();
}

// Export initialized admin instance and functions
export const adminApp = initializeFirebaseAdmin();
export { admin };

// Export a function to get bucket to avoid initialization timing issues
export function getBucket() {
  return admin.storage().bucket();
}

export default admin;