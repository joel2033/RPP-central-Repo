import { initializeApp, getApps } from 'firebase/app';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration using environment variables
// Set these in Replit secrets/environment variables from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rpp-central-database.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rpp-central-database",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rpp-central-database.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "308973286016",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:308973286016:web:dd689d8c6ea79713242c65",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2WHBQW1QES"
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firebase Storage and Auth instances
export const storage = getStorage(app);
export const auth = getAuth(app);

// Connect to emulators in development to avoid network issues
// NOTE: Disabling Storage emulator for signed URL uploads to work properly
if (import.meta.env.DEV) {
  try {
    // Connect to Firebase Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('Connected to Firebase Auth emulator');
  } catch (error) {
    console.log('Firebase Auth emulator not available, using production');
  }
  
  // Disable Storage emulator for now - signed URLs point to production Firebase Storage
  // try {
  //   // Connect to Firebase Storage emulator  
  //   connectStorageEmulator(storage, 'localhost', 9199);
  //   console.log('Connected to Firebase Storage emulator');
  // } catch (error) {
  //   console.log('Firebase Storage emulator not available, using production');
  // }
  console.log('Using production Firebase Storage for signed URL uploads');
}

export default app;