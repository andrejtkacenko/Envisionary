
import * as admin from 'firebase-admin';

let adminApp: admin.App | null = null;

// Check if the app is already initialized to prevent errors during hot-reloading
if (admin.apps.length > 0) {
  adminApp = admin.apps[0];
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      // The key is expected to be a Base64 encoded string. Decode it.
      const decodedKey = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(decodedKey);

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e: any) {
      if (e.code === 'ENOENT') {
         console.error('Could not find Firebase service account key. Server-side Firebase operations will fail.');
      } else if (e instanceof SyntaxError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY due to a syntax error in the JSON. Please ensure it is a valid, Base64-encoded JSON object.', e.message);
      }
      else {
        console.error('Firebase Admin SDK initialization failed:', e);
      }
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Server-side Firebase operations will fail.');
  }
}

export { adminApp };
