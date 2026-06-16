// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
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

  // Complete passwordless email-link sign-in when the user returns via the link.
  // onAuthStateChanged (above) then picks up the signed-in user automatically.
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      // Opened on a different device — re-ask to prevent session injection.
      email = window.prompt('Please confirm your email to finish signing in');
    }
    if (!email) return;
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        // Strip the one-time code from the URL.
        window.history.replaceState(null, '', `${window.location.origin}/`);
      })
      .catch(() => { /* invalid or expired link — user stays signed out */ });
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
