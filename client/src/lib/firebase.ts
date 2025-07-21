import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth'; // For auth if needed

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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firebase Storage and Auth instances
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;