import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { mockDb } from './mockDb';

// Initialize Firebase Admin
let app: admin.app.App;

try {
  // Try to load service account file
  const serviceAccount = require('../../firebase-service-account.json');
  
  if (!admin.apps.length) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  } else {
    app = admin.app();
  }
} catch (error) {
  console.warn('Firebase service account not found, using development mode');
  
  if (!admin.apps.length) {
    // Use default config for development
    app = admin.initializeApp({
      projectId: 'accounti-4698b'
    });
  } else {
    app = admin.app();
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Mock Firebase functions for development
const isDevelopment = process.env.NODE_ENV === 'development';

export const mockAuth = {
  verifyIdToken: async (token: string) => {
    if (isDevelopment && (token === 'mock-token' || token.startsWith('mock-'))) {
      return {
        uid: 'mock-user-id',
        email: 'user@example.com',
        name: 'Mock User'
      };
    }
    return auth.verifyIdToken(token);
  },
  
  createCustomToken: async (uid: string) => {
    if (isDevelopment) {
      return 'mock-custom-token';
    }
    return auth.createCustomToken(uid);
  },
  
  getUserByEmail: async (email: string) => {
    if (isDevelopment) {
      return {
        uid: 'mock-user-id',
        email: email,
        displayName: 'Mock User'
      };
    }
    return auth.getUserByEmail(email);
  }
};

// Use mock database in development
export const getDb = () => {
  return isDevelopment ? mockDb : db;
}; 