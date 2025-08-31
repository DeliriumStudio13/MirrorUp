import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner } from './';

// Redux selectors
import { selectAuthInitialized, selectUser } from '../../store/slices/authSlice';
import { selectUsersInitialized, fetchUsers } from '../../store/slices/userSlice';
import { selectDepartmentsInitialized, fetchDepartments } from '../../store/slices/departmentSlice';
import { selectEvaluationsInitialized, fetchEvaluations } from '../../store/slices/evaluationSlice';

const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationSteps, setInitializationSteps] = useState({
    auth: false,
    users: false,
    departments: false,
    evaluations: false
  });

  // Selectors
  const user = useSelector(selectUser);
  const authInitialized = useSelector(selectAuthInitialized);
  const usersInitialized = useSelector(selectUsersInitialized);
  const departmentsInitialized = useSelector(selectDepartmentsInitialized);
  const evaluationsInitialized = useSelector(selectEvaluationsInitialized);

  // Load data when auth is ready
  useEffect(() => {
    const loadData = async () => {
      if (!authInitialized || !user?.businessId) {
        console.log('⏳ Waiting for auth initialization or business ID...');
        setIsInitializing(true);
        return;
      }

      try {
        console.log('🔄 Loading data for user:', { 
          userId: user.id, 
          businessId: user.businessId,
          authInitialized
        });

        // Load all required data in parallel
        await Promise.all([
          dispatch(fetchUsers(user.businessId)),
          dispatch(fetchDepartments(user.businessId)),
          dispatch(fetchEvaluations({ businessId: user.businessId }))
        ]);

        console.log('✅ Data loading complete');
        setIsInitializing(false);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        setIsInitializing(false);
      }
    };

    loadData();
  }, [dispatch, authInitialized, user?.id, user?.businessId]);

  // Track initialization progress and handle transitions
  useEffect(() => {
    const handleInitialization = async () => {
      // Update initialization steps
      setInitializationSteps(prev => ({
        ...prev,
        auth: authInitialized,
        users: usersInitialized,
        departments: departmentsInitialized,
        evaluations: evaluationsInitialized
      }));

      // Check if all required data is initialized
      const allInitialized = [
        authInitialized,
        usersInitialized,
        departmentsInitialized,
        evaluationsInitialized
      ].every(Boolean);

      if (allInitialized) {
        // Add a small delay to ensure all UI updates are complete
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsInitializing(false);
      }
    };

    handleInitialization();
  }, [authInitialized, usersInitialized, departmentsInitialized, evaluationsInitialized]);

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Initializing Application
          </p>
          <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
            {!authInitialized && (
              <p>• Verifying authentication...</p>
            )}
            {authInitialized && !usersInitialized && (
              <p>• Loading user data...</p>
            )}
            {authInitialized && !departmentsInitialized && (
              <p>• Loading departments...</p>
            )}
            {authInitialized && !evaluationsInitialized && (
              <p>• Loading evaluations...</p>
            )}
          </div>
          <div className="mt-4 text-xs text-gray-400">
            {user?.id && `User: ${user.profile?.firstName} ${user.profile?.lastName}`}
          </div>
        </div>
      </div>
    );
  }

  // Render children once initialized
  return children;

  return children;
};

export default AppInitializer;
