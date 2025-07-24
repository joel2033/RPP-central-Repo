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
          // Try to parse as JSON first
          const serviceAccount = JSON.parse(serviceAccountJson);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.firebasestorage.app'
          });
          console.log('✅ Firebase Admin initialized with JSON service account');
        } catch (parseError) {
          console.error('Error parsing Firebase service account as JSON:', parseError instanceof Error ? parseError.message : 'Unknown parse error');
          
          // Check if it's a raw private key (starts with "-----BEGIN")
          if (serviceAccountJson.startsWith('-----BEGIN') || serviceAccountJson.startsWith('nMII')) {
            console.log('🔑 Detected raw private key format, using GOOGLE_CLOUD_KEY');
            
            // Use GOOGLE_CLOUD_KEY environment variable if available
            const googleCloudKey = process.env.GOOGLE_CLOUD_KEY;
            if (googleCloudKey) {
              try {
                const parsedKey = JSON.parse(googleCloudKey);
                admin.initializeApp({
                  credential: admin.credential.cert(parsedKey),
                  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.firebasestorage.app'
                });
                console.log('✅ Firebase Admin initialized with GOOGLE_CLOUD_KEY');
              } catch (gckError) {
                console.error('Error with GOOGLE_CLOUD_KEY:', gckError instanceof Error ? gckError.message : 'Unknown GOOGLE_CLOUD_KEY error');
                throw new Error('Both FIREBASE_SERVICE_ACCOUNT and GOOGLE_CLOUD_KEY failed to parse');
              }
            } else {
              throw new Error('Raw private key detected but no GOOGLE_CLOUD_KEY provided');
            }
          } else {
            // Fall back to default credentials
            admin.initializeApp({
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.firebasestorage.app'
            });
            console.log('✅ Firebase Admin initialized with default credentials (fallback)');
          }
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