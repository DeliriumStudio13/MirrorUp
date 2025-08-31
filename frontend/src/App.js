import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Redux actions
import { initializeAuth } from './store/slices/authSlice';
import { loadViewPreferences } from './store/slices/uiSlice';

// Route components
import ProtectedRoute from './components/routing/ProtectedRoute';
import PublicRoute from './components/routing/PublicRoute';

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
import { EvaluationTemplatesPage } from './pages/evaluations';

// Admin pages
import AssignmentManagementPage from './pages/admin/AssignmentManagementPage';

// Hierarchical Evaluation System pages
import { 
  MyTeamPage,
  AssignEvaluationsPage,
  ReviewEvaluationsPage,
  EvaluationReviewPage,
  MyEvaluationsPage,
  MyEvaluationResultsPage,
  EvaluationCompletePage,
  PendingEvaluationsPage,
  MyGoalsPage,
  PerformanceHistoryPage,
  TeamPerformancePage,
  BonusAllocationPage
} from './pages/evaluations';

// TODO: Create these pages
// import UserDetailsPage from './pages/users/UserDetailsPage';
// import DepartmentDetailsPage from './pages/departments/DepartmentDetailsPage';
// import EvaluationsPage from './pages/evaluations/EvaluationsPage';
// import EvaluationDetailsPage from './pages/evaluations/EvaluationDetailsPage';
// import CreateEvaluationPage from './pages/evaluations/CreateEvaluationPage';
// import OrgChartPage from './pages/orgChart/OrgChartPage';
// import BonusPage from './pages/bonus/BonusPage';
// import SettingsPage from './pages/settings/SettingsPage';


// Common components
import { LoadingSpinner, ErrorBoundary } from './components/common';
import AppLoader from './components/common/AppLoader';



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
        <AppLoader>
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

            {/* Assignment Management (Admin Only) */}
            <Route path="/assignments" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AssignmentManagementPage />
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
            
            {/* Evaluation Templates */}
            <Route path="/evaluation-templates" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationTemplatesPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Hierarchical Evaluation System Routes */}
            
            {/* Manager/Supervisor Routes */}
            <Route path="/my-team" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyTeamPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/assign-evaluations" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AssignEvaluationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/review-evaluations" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReviewEvaluationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/review-evaluations/:evaluationId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationReviewPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* All User Types - My Evaluations */}
            <Route path="/my-evaluations" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyEvaluationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/my-evaluation-results/:evaluationId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyEvaluationResultsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/my-evaluations/:evaluationId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationCompletePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/evaluation-complete/:evaluationId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationCompletePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/evaluation-review/:evaluationId" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EvaluationReviewPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Employee Specific Routes */}
            <Route path="/pending-evaluations" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PendingEvaluationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/my-goals" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyGoalsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/performance-history" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PerformanceHistoryPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Team Performance Routes */}
            <Route path="/team-performance" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TeamPerformancePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Bonus Allocation Routes */}
            <Route path="/bonus-allocation" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BonusAllocationPage />
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
        </AppLoader>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
