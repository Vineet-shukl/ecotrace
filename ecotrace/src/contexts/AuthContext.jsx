// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsub;
  }, []);

  // Complete passwordless email-link flows when the user returns via the link:
  //  - mode 'link' (started from Settings): link the credential to the already
  //    signed-in user so they can later sign in with just their email.
  //  - otherwise: a fresh passwordless sign-in.
  // onAuthStateChanged (above) then reflects the resulting user.
  useEffect(() => {
    const url = window.location.href;
    if (!isSignInWithEmailLink(auth, url)) return;

    const mode = window.localStorage.getItem('emailLinkMode');
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      // Opened on a different device — re-ask to prevent session injection.
      email = window.prompt('Please confirm your email to finish signing in');
    }
    if (!email) return;

    // Clears stored state and lands on a clean URL (Settings for linking, root otherwise).
    const finish = (destination) => {
      window.localStorage.removeItem('emailForSignIn');
      window.localStorage.removeItem('emailLinkMode');
      if (destination) window.location.replace(destination);
      else window.history.replaceState(null, '', `${window.location.origin}/`);
    };

    if (mode === 'link') {
      const settingsUrl = `${window.location.origin}/settings`;
      auth.authStateReady().then(() => {
        if (!auth.currentUser) {
          // No session to link to — fall back to a fresh sign-in.
          return signInWithEmailLink(auth, email, url).then(() => finish());
        }
        const credential = EmailAuthProvider.credentialWithLink(email, url);
        return linkWithCredential(auth.currentUser, credential).then(() => finish(settingsUrl));
      }).catch(() => finish(settingsUrl));
    } else {
      signInWithEmailLink(auth, email, url)
        .then(() => finish())
        .catch(() => finish());
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

// The provider and its consumer hook are intentionally co-located.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
