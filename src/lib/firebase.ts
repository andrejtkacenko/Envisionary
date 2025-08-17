// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8JxvjvJzcL0DPVhM1jzEcwUXSS7qPGnE",
  authDomain: "zenith-flow-5x266.firebaseapp.com",
  projectId: "zenith-flow-5x266",
  storageBucket: "zenith-flow-5x266.firebasestorage.app",
  messagingSenderId: "437158497095",
  appId: "1:437158497095:web:e2031eece10d7f4e099a62",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
