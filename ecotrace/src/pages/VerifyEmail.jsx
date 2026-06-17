// src/pages/VerifyEmail.jsx — shown when a password account hasn't verified its email
import { useState, useEffect } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function VerifyEmail() {
  useDocumentTitle('Verify your email');
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState('');

  // Auto-detect verification (link may be opened in another tab/device).
  useEffect(() => {
    const id = setInterval(async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        clearInterval(id);
        window.location.replace(`${window.location.origin}/`);
      }
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const resend = async () => {
    if (!auth.currentUser) return;
    setStatus('sending');
    try {
      await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/` });
      window.sessionStorage.setItem('verifyEmailSentAt', String(Date.now()));
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  // Auto-send once on mount (e.g. right after sign-up), with a 60s cooldown
  // so revisits/reloads don't trigger auth/too-many-requests.
  useEffect(() => {
    const last = Number(window.sessionStorage.getItem('verifyEmailSentAt') || 0);
    if (!auth.currentUser || auth.currentUser.emailVerified) return;
    if (Date.now() - last < 60000) return;
    sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/` })
      .then(() => {
        window.sessionStorage.setItem('verifyEmailSentAt', String(Date.now()));
        setStatus('sent');
      })
      .catch(() => setStatus('error'));
  }, []);

  // Reload the user record; if verified, onAuthStateChanged-derived state updates.
  const recheck = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    setInfo('');
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        window.location.replace(`${window.location.origin}/`);
      } else {
        setInfo('Not verified yet. Open the link in your email, then check again.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">📧</div>
          <div className="auth-logo-title">Verify your email</div>
          <div className="auth-logo-sub">
            We sent a verification link to <strong>{user?.email}</strong>. Open it to activate your account.
          </div>
        </div>

        {status === 'sent' && (
          <div role="status" style={{ marginBottom: 'var(--sp-4)', color: 'var(--clr-primary)', fontSize: 'var(--fs-sm)', padding: 'var(--sp-3)', background: 'rgba(34,211,165,0.1)', borderRadius: 'var(--rad-md)', border: '1px solid rgba(34,211,165,0.2)', textAlign: 'center' }}>
            ✅ Verification email sent again.
          </div>
        )}
        {status === 'error' && (
          <div role="alert" style={{ marginBottom: 'var(--sp-4)', color: 'var(--clr-danger)', fontSize: 'var(--fs-sm)' }}>
            Couldn&apos;t send the email. Try again in a moment.
          </div>
        )}
        {info && (
          <div role="status" style={{ marginBottom: 'var(--sp-4)', color: 'var(--clr-text-2)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>
            {info}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <button id="verify-recheck-btn" className="btn btn-primary btn-lg" onClick={recheck} disabled={checking} style={{ width: '100%' }}>
            {checking ? <span className="spinner" /> : null} I&apos;ve verified — continue
          </button>
          <button id="verify-resend-btn" className="btn btn-ghost btn-sm" onClick={resend} disabled={status === 'sending'} style={{ width: '100%' }}>
            {status === 'sending' ? <span className="spinner" /> : '✉️'} Resend verification email
          </button>
          <button id="verify-signout-btn" className="btn btn-ghost btn-sm" onClick={() => signOut(auth)} style={{ width: '100%', color: 'var(--clr-danger)', borderColor: 'rgba(248,113,113,0.3)' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
