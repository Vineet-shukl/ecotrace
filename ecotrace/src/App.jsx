// src/App.jsx — Root routing with Firebase Auth guard
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout       from './components/Layout';
import FirestoreTest from './components/FirestoreTest';
import AuthPage     from './pages/AuthPage';
import Dashboard    from './pages/Dashboard';
import LogActivity  from './pages/LogActivity';
import Insights     from './pages/Insights';
import Achievements from './pages/Achievements';
import Settings     from './pages/Settings';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
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
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

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
        element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />}
      />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout>
              <Dashboard />
              <FirestoreTest />
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
