import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let firebaseAdmin: admin.app.App;

function initializeFirebaseAdmin(): admin.app.App {
  if (!admin.apps.length) {
    // Check if service account is provided via environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.appspot.com'
        });
        console.log('Firebase Admin initialized with service account');
      } catch (error) {
        console.error('Error parsing Firebase service account:', error);
        // Fall back to default credentials
        firebaseAdmin = admin.initializeApp({
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.appspot.com'
        });
        console.log('Firebase Admin initialized with default credentials (service account parse failed)');
      }
    } else {
      // Initialize with default credentials (for environments like Google Cloud)
      firebaseAdmin = admin.initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rpp-central-database.appspot.com'
      });
      console.log('Firebase Admin initialized with default credentials');
    }
  } else {
    firebaseAdmin = admin.apps[0];
  }
  
  return firebaseAdmin;
}

// Export initialized admin instance
export const adminApp = initializeFirebaseAdmin();
export const adminBucket = adminApp.storage().bucket();

export default adminApp;