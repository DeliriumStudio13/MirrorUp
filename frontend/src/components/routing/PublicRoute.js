import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectAuthLoading, selectAuthInitialized } from '../../store/slices/authSlice';
import { LoadingSpinner } from '../common';

const PublicRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const initialized = useSelector(selectAuthInitialized);
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔓 Public Route:', {
      isAuthenticated,
      isLoading,
      initialized,
      path: location.pathname
    });
  }, [isAuthenticated, isLoading, initialized, location]);

  // For public routes, we don't need to wait for full initialization
  // Only check if we're already authenticated
  if (initialized && isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    console.log('✅ Already authenticated, redirecting to:', from);
    return <Navigate to={from} replace />;
  }

  // Show loading only if we're in the process of checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return children;
};

export default PublicRoute;
