// src/pages/Settings.jsx — User profile, baseline, preferences
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, signOut, sendSignInLinkToEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Settings() {
  useDocumentTitle('Settings');
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal]   = useState('');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');
  const [linkStatus, setLinkStatus] = useState('idle'); // idle | sending | sent | error

  const providerIds  = user?.providerData?.map(p => p.providerId) ?? [];
  const hasGoogle     = providerIds.includes('google.com');
  const hasEmailLink  = providerIds.includes('password');

  // Send a one-time link; AuthContext links the credential when the user
  // returns via it (emailLinkMode === 'link').
  const handleEnableEmailLink = async () => {
    if (!user?.email) return;
    setLinkStatus('sending');
    try {
      await sendSignInLinkToEmail(auth, user.email, {
        url: `${window.location.origin}/settings`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', user.email);
      window.localStorage.setItem('emailLinkMode', 'link');
      setLinkStatus('sent');
    } catch {
      setLinkStatus('error');
    }
  };

  useEffect(() => {
    if (!user) return;
    // Populate form state once the profile read resolves (keeps all setState
    // calls inside the async callback rather than synchronously in the effect).
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      setDisplayName(user.displayName || '');
      if (snap.exists()) {
        setGoal(snap.data().annualGoalKg ?? '');
      }
    });
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError('');
    try {
      await Promise.all([
        updateProfile(auth.currentUser, { displayName }),
        setDoc(doc(db, 'users', user.uid), {
          displayName,
          annualGoalKg: Number(goal),
          updatedAt: new Date(),
        }, { merge: true }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    navigate('/');
  }

  return (
    <div className="page">
      <header className="page-header animate-fade-up">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile and reduction goal</p>
      </header>

      <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        {/* Profile card */}
        <section className="card animate-fade-up animate-fade-up-1" aria-labelledby="profile-heading">
          <h2 id="profile-heading" style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--sp-5)' }}>👤 Profile</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-2)' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--clr-primary)' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--grad-primary)', display: 'grid', placeItems: 'center', fontSize: '1.4rem', color: '#0a0f1a', fontWeight: 800 }}>
                  {(displayName || user?.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600 }}>{user?.displayName || 'User'}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>{user?.email}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="display-name">Display name</label>
              <input
                id="display-name"
                type="text"
                className="form-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="annual-goal">Annual CO₂e reduction goal (kg)</label>
              <input
                id="annual-goal"
                type="number"
                className="form-input"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. 500"
                min="0"
              />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>
                Average UK adult emits ~5,500 kg CO₂e/year. A 10% cut = 550 kg.
              </span>
            </div>

            {error && <div role="alert" style={{ color: 'var(--clr-danger)', fontSize: 'var(--fs-sm)' }}>{error}</div>}
            {saved && <div role="status" style={{ color: 'var(--clr-primary)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>✅ Saved!</div>}

            <button
              id="save-settings-btn"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ alignSelf: 'flex-start' }}
            >
              {saving ? <span className="spinner" /> : '💾 Save Changes'}
            </button>
          </form>
        </section>

        {/* Sign-in methods card */}
        <section className="card animate-fade-up animate-fade-up-2" aria-labelledby="signin-heading">
          <h2 id="signin-heading" style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>🔑 Sign-in methods</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--fs-sm)' }}>Google</span>
              {hasGoogle
                ? <span className="badge badge-green">✓ Connected</span>
                : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>Not connected</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--fs-sm)' }}>Passwordless email link</span>
              {hasEmailLink
                ? <span className="badge badge-green">✓ Enabled</span>
                : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>Not enabled</span>}
            </div>

            {!hasEmailLink && (linkStatus === 'sent' ? (
              <div role="status" style={{ marginTop: 'var(--sp-2)', color: 'var(--clr-primary)', fontSize: 'var(--fs-sm)', padding: 'var(--sp-3)', background: 'rgba(34,211,165,0.1)', borderRadius: 'var(--rad-md)', border: '1px solid rgba(34,211,165,0.2)' }}>
                ✅ Check <strong>{user?.email}</strong> for a link. Open it on this device to enable passwordless sign-in.
              </div>
            ) : (
              <button
                id="enable-email-link-btn"
                className="btn btn-ghost btn-sm"
                onClick={handleEnableEmailLink}
                disabled={linkStatus === 'sending'}
                style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-2)' }}
              >
                {linkStatus === 'sending' ? <span className="spinner" /> : '✉️'} Enable passwordless email sign-in
              </button>
            ))}

            {linkStatus === 'error' && (
              <div role="alert" style={{ color: 'var(--clr-danger)', fontSize: 'var(--fs-sm)' }}>
                Couldn&apos;t send the link. Please try again.
              </div>
            )}
          </div>
        </section>

        {/* Account card */}
        <section className="card animate-fade-up animate-fade-up-3" aria-labelledby="account-heading">
          <h2 id="account-heading" style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>🔒 Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) 0', borderBottom: '1px solid var(--clr-border)' }}>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Email</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)' }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) 0', borderBottom: '1px solid var(--clr-border)' }}>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Account ID</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{user?.uid?.slice(0, 20)}…</div>
              </div>
            </div>
            <button
              id="signout-settings-btn"
              className="btn btn-ghost"
              onClick={handleSignOut}
              style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-2)', color: 'var(--clr-danger)', borderColor: 'rgba(248,113,113,0.3)' }}
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
