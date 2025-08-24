
import * as admin from 'firebase-admin';

let serviceAccount: admin.ServiceAccount | null = null;
let initialized = false;

try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
  } else {
    // The key is expected to be a Base64 encoded string.
    serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
  }
} catch (e) {
    if (e instanceof SyntaxError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
    } else {
        console.error("An unexpected error occurred while processing FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
}


if (!admin.apps.length) {
  if (serviceAccount) {
     try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        initialized = true;
     } catch (e) {
        console.error("Firebase Admin SDK initialization failed:", e);
     }
  } else {
    console.warn("Firebase Admin SDK not initialized because the service account key is missing or malformed. Server-side Firebase operations will fail.");
  }
} else {
    initialized = true; // Already initialized
}


export const adminApp = initialized ? admin.apps[0] : null;
