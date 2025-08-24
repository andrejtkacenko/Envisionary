
import * as admin from 'firebase-admin';

let serviceAccount: admin.ServiceAccount | null = null;

try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
  } else {
    serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
  }
} catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
}


if (!admin.apps.length) {
  if (serviceAccount) {
     try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
     } catch (e) {
        console.error("Firebase Admin SDK initialization failed:", e);
     }
  } else {
    console.warn("Firebase Admin SDK not initialized because the service account key is missing or malformed. Server-side Firebase operations will fail.");
  }
}


export const adminApp = admin.apps.length > 0 ? admin.apps[0] : null;
