// Test Firebase upload functionality
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.VITE_GOOGLE_API_KEY,
  authDomain: "rpp-central-database.firebaseapp.com",
  projectId: "rpp-central-database",
  storageBucket: "rpp-central-database.firebasestorage.app",
  messagingSenderId: "308973286016",
  appId: "1:308973286016:web:dd689d8c6ea79713242c65",
  measurementId: "G-2WHBQW1QES"
};

async function testFirebaseUpload() {
  try {
    console.log('🔥 Testing Firebase upload...');
    console.log('🔥 API Key:', process.env.VITE_GOOGLE_API_KEY ? 'Present' : 'Missing');
    
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
    
    const storage = getStorage(app);
    console.log('✅ Firebase storage initialized');
    
    // Create a small test file
    const testData = Buffer.from('test file content');
    const storageRef = ref(storage, 'test/test-upload.txt');
    
    console.log('🔥 Starting upload task...');
    const uploadTask = uploadBytesResumable(storageRef, testData);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload progress:', progress + '%');
      },
      (error) => {
        console.error('❌ Upload error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          name: error.name
        });
      },
      () => {
        console.log('✅ Upload completed successfully');
      }
    );
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFirebaseUpload();