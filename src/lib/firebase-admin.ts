
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!admin.apps.length) {
  if (!serviceAccount) {
    console.warn("Firebase Admin SDK not initialized. Service account key is missing. Some server-side Firebase operations might fail.");
  } else {
     admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
  }
}


export const adminApp = admin.apps[0] || null;
