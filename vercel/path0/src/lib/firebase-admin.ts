
import * as admin from 'firebase-admin';

// This will be automatically populated by Vercel's environment variables
// or by a .env.local file for local development.
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let serviceAccount: admin.ServiceAccount | null = null;

if (serviceAccountKey) {
  try {
    // Firebase Admin SDK can parse the JSON string directly if it's base64 encoded
    serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
  } catch (e) {
      // Or if it's a raw JSON string
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (e2) {
         console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it's a valid JSON or a Base64 encoded JSON.", e2);
      }
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Firebase Admin features will not work.");
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
