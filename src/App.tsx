import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'sonner';

// Pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import DashboardLayout from './components/Layout/DashboardLayout';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
          
          {/* Redirect old routes to dashboard */}
          <Route path="/submit" element={<Navigate to="/dashboard" replace />} />
          <Route path="/map" element={<Navigate to="/dashboard" replace />} />
          <Route path="/events" element={<Navigate to="/dashboard" replace />} />
          <Route path="/wallet" element={<Navigate to="/dashboard" replace />} />
          <Route path="/wall" element={<Navigate to="/dashboard" replace />} />
          <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/government" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
