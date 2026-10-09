import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOfficial?: boolean;
  requireGovernment?: boolean;
  requireContributor?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOfficial = false,
  requireGovernment = false,
  requireContributor = false
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireOfficial && profile?.role !== 'official') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireGovernment && profile?.role !== 'government') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireContributor && !['contributor', 'user', 'official', 'admin', 'guest'].includes(profile?.role || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
