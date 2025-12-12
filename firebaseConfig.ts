import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// MOCK CONFIGURATION
// Replace these values with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyCqTA_-NsCKrjcr4Ori1rj7ts78XZBfRyM",
  authDomain: "kinexa-544e2.firebaseapp.com",
  projectId: "kinexa-544e2",
  storageBucket: "kinexa-544e2.firebasestorage.app",
  messagingSenderId: "288592139508",
  appId: "1:288592139508:web:cfe7e6fa4eb27522283aa1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);