import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Organizer from './pages/Organizer';
import Duplicates from './pages/Duplicates';
import Search from './pages/Search';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import RecycleBin from './pages/RecycleBin';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Files from './pages/Files';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-oracle-500 to-cyan-600 flex items-center justify-center text-2xl font-bold shadow-[0_8px_32px_-4px_rgba(6,182,212,0.3)] animate-float">
            FO
          </div>
          <div className="w-8 h-8 border-2 border-oracle-500/30 border-t-oracle-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  return <div className="page-enter">{children}</div>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/organizer" element={<PrivateRoute><Organizer /></PrivateRoute>} />
      <Route path="/duplicates" element={<PrivateRoute><Duplicates /></PrivateRoute>} />
      <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
      <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/files" element={<PrivateRoute><Files /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      <Route path="/recycle" element={<PrivateRoute><RecycleBin /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
