// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "zenith-flow-5x266",
  "appId": "1:437158497095:web:e2031eece10d7f4e099a62",
  "storageBucket": "zenith-flow-5x266.firebasestorage.app",
  "apiKey": "AIzaSyB8JxvjvJzcL0DPVhM1jzEcwUXSS7qPGnE",
  "authDomain": "zenith-flow-5x266.firebaseapp.com",
  "messagingSenderId": "437158497095"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
