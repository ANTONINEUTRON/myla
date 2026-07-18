import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const db = admin.firestore();
export { admin };
