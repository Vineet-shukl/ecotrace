// src/firebase.js — Firebase initialization for EcoTrace web app
// All config values are loaded from environment variables (VITE_FIREBASE_*).
// - Local dev: copy .env.example → .env and fill in your values.
// - CI/CD:     Cloud Build injects values from Secret Manager at build time.
// - NEVER hardcode Firebase config here — use env vars only.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail fast if any required config is missing (catches misconfigured CI/CD)
const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];
for (const key of REQUIRED_KEYS) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `[firebase.js] Missing required env var: VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}\n` +
      'Copy .env.example → .env and fill in your Firebase project values.'
    );
  }
}

const app = initializeApp(firebaseConfig);

export const auth          = getAuth(app);
export const db            = getFirestore(app);
export const analytics     = getAnalytics(app);
export const googleProvider = new GoogleAuthProvider();

// Always show the Google account picker (avoids silent sign-in hangs)
googleProvider.setCustomParameters({ prompt: 'select_account' });
