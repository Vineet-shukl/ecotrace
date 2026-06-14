// src/firebase.js — Firebase initialization for EcoTrace web app
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  projectId: "ecotrace-app-123",
  appId: "1:483088643135:web:4fd2848db955af12b0748a",
  storageBucket: "ecotrace-app-123.firebasestorage.app",
  apiKey: "AIzaSyAff5iV8Ztn11SpcL403N6WLn-skRC1y-E",
  authDomain: "ecotrace-app-123.firebaseapp.com",
  messagingSenderId: "483088643135",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const googleProvider = new GoogleAuthProvider();
