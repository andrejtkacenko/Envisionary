
import * as admin from 'firebase-admin';

let serviceAccount: admin.ServiceAccount | null = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      // Vercel might pass it as a Base64 encoded string, or it could be a direct JSON string.
      // We try to handle both.
      if (key.startsWith('{')) {
          serviceAccount = JSON.parse(key);
      } else {
          serviceAccount = JSON.parse(Buffer.from(key, 'base64').toString('utf-8'));
      }
  }
} catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
}


if (!admin.apps.length) {
  if (!serviceAccount) {
    console.warn("Firebase Admin SDK not initialized. Service account key is missing or malformed. Some server-side Firebase operations might fail.");
  } else {
     try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
     } catch (e) {
        console.error("Firebase Admin SDK initialization failed", e);
     }
  }
}


export const adminApp = admin.apps.length > 0 ? admin.apps[0] : null;
