import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectAuthLoading, selectAuthInitialized } from '../../store/slices/authSlice';
import { LoadingSpinner } from '../common';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const initialized = useSelector(selectAuthInitialized);
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔒 Protected Route:', {
      isAuthenticated,
      isLoading,
      initialized,
      path: location.pathname
    });
  }, [isAuthenticated, isLoading, initialized, location]);

  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log('🚫 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
