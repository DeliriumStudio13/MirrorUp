import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Redux actions and selectors
import { initializeAuth, selectIsAuthenticated, selectAuthLoading, selectAuthInitialized } from './store/slices/authSlice';
import { loadViewPreferences } from './store/slices/uiSlice';

// Layout components
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth pages
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';

// Dashboard pages
import { DashboardOverview } from './pages/dashboard';

// Users pages
import { UsersPage } from './pages/users';
// Departments pages
import { DepartmentsPage } from './pages/departments';
// Organization Chart pages
import { OrganizationChartPage } from './pages/organization';

// TODO: Create these pages
// import UserDetailsPage from './pages/users/UserDetailsPage';
// import DepartmentDetailsPage from './pages/departments/DepartmentDetailsPage';
// import EvaluationsPage from './pages/evaluations/EvaluationsPage';
// import EvaluationDetailsPage from './pages/evaluations/EvaluationDetailsPage';
// import CreateEvaluationPage from './pages/evaluations/CreateEvaluationPage';
// import OrgChartPage from './pages/orgChart/OrgChartPage';
// import BonusPage from './pages/bonus/BonusPage';
// import SettingsPage from './pages/settings/SettingsPage';
// import ProfilePage from './pages/profile/ProfilePage';

// Common components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const initialized = useSelector(selectAuthInitialized);
  
  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const initialized = useSelector(selectAuthInitialized);
  
  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Initialize Firebase auth listener
    dispatch(initializeAuth());
    
    // Load UI preferences
    dispatch(loadViewPreferences());
  }, [dispatch]);
  
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={
              <PublicRoute>
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <AuthLayout>
                  <RegisterPage />
                </AuthLayout>
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <AuthLayout>
                  <ForgotPasswordPage />
                </AuthLayout>
              </PublicRoute>
            } />
            <Route path="/reset-password/:token" element={
              <PublicRoute>
                <AuthLayout>
                  <ResetPasswordPage />
                </AuthLayout>
              </PublicRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardOverview />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Users Management */}
            <Route path="/users" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UsersPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Departments Management */}
            <Route path="/departments" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DepartmentsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Organization Chart */}
            <Route path="/organization-chart" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <OrganizationChartPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* TODO: Implement these routes when pages are created */}
            {/*
            <Route path="/users/:userId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UserDetailsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/departments/:departmentId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DepartmentDetailsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/evaluations" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/evaluations/create" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CreateEvaluationPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/evaluations/:evaluationId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationDetailsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/org-chart" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <OrgChartPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/bonus" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BonusPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            */}
            
            {/* Catch all - 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a href="/dashboard" className="btn-primary">
                    Go to Dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
