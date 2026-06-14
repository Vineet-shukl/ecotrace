// src/components/FirestoreTest.jsx — Verifies Firestore read/write (Phase 1 check)
import { useEffect, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function FirestoreTest() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | running | success | error
  const [msg, setMsg] = useState('');

  async function runTest() {
    if (!user) return;
    setStatus('running');
    setMsg('');
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, {
        displayName: user.displayName || '',
        email: user.email,
        createdAt: new Date(),
        currentStreak: 0,
        totalSavedKg: 0,
      }, { merge: true });

      const snap = await getDoc(ref);
      if (snap.exists()) {
        setStatus('success');
        setMsg(`✅ Firestore read/write OK. Doc data: ${JSON.stringify(snap.data(), null, 2)}`);
      } else {
        throw new Error('Document not found after write');
      }
    } catch (err) {
      setStatus('error');
      setMsg(`❌ Error: ${err.message}`);
    }
  }

  useEffect(() => {
    if (user) runTest();
  }, [user]);

  if (status === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--sp-6)',
        left: 'var(--sp-4)',
        zIndex: 998,
        maxWidth: 360,
        background: 'var(--clr-surface)',
        border: `1px solid ${status === 'success' ? 'rgba(34,211,165,0.4)' : status === 'error' ? 'rgba(248,113,113,0.4)' : 'var(--clr-border)'}`,
        borderRadius: 'var(--rad-md)',
        padding: 'var(--sp-4)',
        fontSize: 'var(--fs-xs)',
        fontFamily: 'monospace',
        boxShadow: 'var(--shadow-lg)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        display: status === 'idle' ? 'none' : 'block',
      }}
      role="status"
      aria-live="polite"
    >
      <strong style={{ display: 'block', marginBottom: 'var(--sp-2)', fontFamily: 'Inter, sans-serif', fontSize: 'var(--fs-xs)' }}>
        Phase 1 — Firestore Test
      </strong>
      {status === 'running' ? <span className="spinner" /> : msg}
    </div>
  );
}
