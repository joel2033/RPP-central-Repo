import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

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
export default app;