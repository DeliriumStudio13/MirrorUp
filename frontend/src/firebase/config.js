/**
 * Firebase Configuration and Initialization
 * MirrorUp Employee Evaluation System
 * 
 * This file initializes Firebase services with proper error handling
 * and environment-specific configurations following industry standards.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Firebase configuration for MirrorUp project
const firebaseConfig = {
  apiKey: "AIzaSyD8ACB8656g7lSdMA5h4nU9bj37hRaMjGQ",
  authDomain: "mirrorup-e71a0.firebaseapp.com",
  projectId: "mirrorup-e71a0",
  storageBucket: "mirrorup-e71a0.firebasestorage.app",
  messagingSenderId: "852717548637",
  appId: "1:852717548637:web:bf2e1aaa2a0615ebbc89b4",
  measurementId: "G-GE20LY3H3H"
};

// Validate required config
const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingConfig = requiredConfig.filter(key => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  throw new Error(`Missing required Firebase config: ${missingConfig.join(', ')}`);
}

// Initialize Firebase App
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialized successfully');
} catch (error) {
  console.error('❌ Firebase App initialization failed:', error);
  throw new Error('Failed to initialize Firebase App');
}

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Initialize Analytics (only in production and if supported)
let analytics = null;
if (isProduction && firebaseConfig.measurementId) {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('✅ Firebase Analytics initialized');
    } else {
      console.log('⚠️ Firebase Analytics not supported in this environment');
    }
  }).catch(error => {
    console.warn('⚠️ Firebase Analytics initialization failed:', error);
  });
}

export { analytics };

// Development-only: Firebase Emulator Connection
// Note: Remove this section when deploying to production
if (isDevelopment && process.env.REACT_APP_USE_EMULATORS === 'true') {
  console.log('🔧 Connecting to Firebase Emulators...');
  
  try {
    // Auth Emulator
    if (!auth._delegate._config.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      console.log('✅ Connected to Auth Emulator');
    }
    
    // Firestore Emulator  
    if (!db._delegate._settings?.host?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('✅ Connected to Firestore Emulator');
    }
    
    // Storage Emulator
    if (!storage._delegate._host.includes('localhost')) {
      connectStorageEmulator(storage, "localhost", 9199);
      console.log('✅ Connected to Storage Emulator');
    }
    
    // Functions Emulator
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log('✅ Connected to Functions Emulator');
    
  } catch (error) {
    console.warn('⚠️ Emulator connection warning (this is normal if emulators are not running):', error.message);
  }
} else if (isDevelopment) {
  console.log('🌐 Using production Firebase services in development mode');
}

// Service status check
const checkFirebaseConnection = async () => {
  try {
    // Test Firestore connection
    await db._delegate.enableNetwork();
    console.log('✅ Firebase services connected and ready');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection check failed:', error);
    return false;
  }
};

// Export connection checker for app initialization
export { checkFirebaseConnection };

// Export the app instance
export default app;

// Development utilities
if (isDevelopment) {
  // Make Firebase services available on window for debugging
  window.firebase = {
    app,
    auth,
    db,
    storage,
    functions,
    analytics,
    config: firebaseConfig
  };
  console.log('🔧 Firebase services attached to window.firebase for debugging');
}