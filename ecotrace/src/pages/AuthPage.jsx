// src/pages/AuthPage.jsx — Sign-in with Google + Email/Password
import { useState } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AuthPage() {
  useDocumentTitle('Sign In');
  const [mode,    setMode]    = useState('signin'); // 'signin' | 'signup'
  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // AuthContext onAuthStateChanged picks up the user and navigates
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — not an error
      } else if (e.code === 'auth/popup-blocked') {
        // Browser blocked the popup — fall back to redirect flow
        await signInWithRedirect(auth, googleProvider);
        return; // page will navigate away
      } else {
        setError(e.message);
      }
      setLoading(false);
    }
  };

  // Passwordless: email the user a one-time sign-in link. Completion is
  // handled in AuthContext when they return via the link.
  const handleEmailLink = async () => {
    setError('');
    if (!email) { setError('Enter your email above to get a sign-in link.'); return; }
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/`, // must be an authorized domain
        handleCodeInApp: true,             // required for email-link sign-in
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Saved so the same-device return flow doesn't re-prompt for the email.
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
    } catch (e) {
      const msgs = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/missing-email': 'Please enter your email address.',
        'auth/operation-not-allowed': 'Email-link sign-in is not enabled for this project yet.',
      };
      setError(msgs[e.code] || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      const msgs = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/weak-password': 'Password must be at least 6 characters.',
      };
      setError(msgs[e.code] || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🌿</div>
          <div className="auth-logo-title">EcoTrace</div>
          <div className="auth-logo-sub">Track your carbon footprint, build better habits</div>
        </div>

        {/* Google Sign-In */}
        <button
          id="google-signin-btn"
          className="google-btn"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        {/* Email Form */}
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div role="alert" style={{ color: 'var(--clr-danger)', fontSize: 'var(--fs-sm)', padding: 'var(--sp-3)', background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--rad-md)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </div>
          )}

          <button
            id="email-auth-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? <span className="spinner" /> : null}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Passwordless email-link sign-in */}
        {linkSent ? (
          <div
            role="status"
            style={{ marginTop: 'var(--sp-4)', color: 'var(--clr-primary)', fontSize: 'var(--fs-sm)', padding: 'var(--sp-3)', background: 'rgba(34,211,165,0.1)', borderRadius: 'var(--rad-md)', border: '1px solid rgba(34,211,165,0.2)', textAlign: 'center' }}
          >
            ✅ Sign-in link sent to <strong>{email}</strong>. Check your inbox and open it on this device.
          </div>
        ) : (
          <button
            id="email-link-btn"
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleEmailLink}
            disabled={loading}
            style={{ width: '100%', marginTop: 'var(--sp-4)' }}
          >
            ✉️ Email me a sign-in link (no password)
          </button>
        )}

        {/* Toggle */}
        <p style={{ textAlign: 'center', marginTop: 'var(--sp-5)', fontSize: 'var(--fs-sm)', color: 'var(--clr-text-muted)' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            id="toggle-auth-mode"
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--clr-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--fs-sm)' }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
