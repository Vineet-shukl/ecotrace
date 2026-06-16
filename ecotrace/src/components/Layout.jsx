// src/components/Layout.jsx — Responsive app shell with sidebar + mobile nav
import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BadgeCelebration from './BadgeCelebration';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/log',       icon: '✏️',  label: 'Log Activity' },
  { to: '/insights',  icon: '💡', label: 'AI Insights' },
  { to: '/achievements', icon: '🏆', label: 'Achievements' },
  { to: '/settings',  icon: '⚙️',  label: 'Settings' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const hamburgerRef = useRef(null);
  const sidebarRef = useRef(null);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  // When the mobile sidebar opens: close on Escape, move focus into it, and
  // restore focus to the hamburger when it closes (keyboard a11y).
  useEffect(() => {
    if (!sidebarOpen) return;
    const hamburger = hamburgerRef.current; // capture for the cleanup closure
    const onKeyDown = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    sidebarRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      hamburger?.focus();
    };
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      {/* Skip link — first in tab order for keyboard/screen-reader users */}
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* ── Mobile Top Navbar ──────────────────────────── */}
      <nav className="navbar" aria-label="Mobile navigation">
        <div className="navbar-logo">
          <span className="navbar-logo-icon" aria-hidden="true">🌿</span>
          <span className="navbar-logo-text">EcoTrace</span>
        </div>
        <button
          id="hamburger-btn"
          ref={hamburgerRef}
          className="hamburger"
          aria-label="Open navigation menu"
          aria-expanded={sidebarOpen}
          aria-controls="sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ── Sidebar Overlay (mobile) ───────────────────── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside
        id="sidebar"
        ref={sidebarRef}
        tabIndex={-1}
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Main navigation"
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen ? true : undefined}
      >
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.5rem' }}>🌿</span>
          <span className="sidebar-logo-text">EcoTrace</span>
        </div>

        <nav className="nav-section" aria-label="Primary">
          <span className="nav-label">Menu</span>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + sign out */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--clr-border)', paddingTop: 'var(--sp-4)' }}>
          {user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    aria-hidden="true"
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--clr-border)' }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grad-primary)', display: 'grid', placeItems: 'center', fontSize: '0.85rem', color: '#0a0f1a', fontWeight: 700 }}>
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || 'User'}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--clr-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                id="signout-btn"
                className="btn btn-ghost btn-sm"
                onClick={handleSignOut}
                style={{ width: '100%' }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="main-content" id="main-content">
        {children}
      </main>

      {/* Badge celebration — global, polls Firestore for new badges */}
      <BadgeCelebration />
    </div>
  );
}
