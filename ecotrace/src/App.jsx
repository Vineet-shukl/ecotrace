// src/App.jsx — Root routing with Firebase Auth guard
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout        from './components/Layout';
import AuthPage      from './pages/AuthPage';
import VerifyEmail   from './pages/VerifyEmail';
import Onboarding   from './pages/Onboarding';
import Dashboard    from './pages/Dashboard';
import LogActivity  from './pages/LogActivity';
import Insights     from './pages/Insights';
import Achievements from './pages/Achievements';
import Settings     from './pages/Settings';

function RequireAuth({ children }) {
  const { user, loading, needsVerification } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '2rem' }}>🌿</span>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span style={{ color: 'var(--clr-text-muted)', fontSize: 'var(--fs-sm)' }}>Loading EcoTrace…</span>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  if (needsVerification) return <Navigate to="/verify-email" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading, needsVerification } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '2rem' }}>🌿</span>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    </div>
  );

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={needsVerification ? '/verify-email' : '/onboarding'} replace />
            : <AuthPage />
        }
      />

      {/* Email verification gate (auth required, no layout) */}
      <Route
        path="/verify-email"
        element={
          !user ? <Navigate to="/" replace />
            : needsVerification ? <VerifyEmail />
            : <Navigate to="/onboarding" replace />
        }
      />

      {/* Onboarding (protected — needs auth, no layout) */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout>
              <Dashboard />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/log"
        element={
          <RequireAuth>
            <Layout><LogActivity /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/insights"
        element={
          <RequireAuth>
            <Layout><Insights /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/achievements"
        element={
          <RequireAuth>
            <Layout><Achievements /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Layout><Settings /></Layout>
          </RequireAuth>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
