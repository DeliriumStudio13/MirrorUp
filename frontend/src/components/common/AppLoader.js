import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectAuthInitialized, selectIsAuthenticated, selectUser } from '../../store/slices/authSlice';
import { selectUsersInitialized } from '../../store/slices/userSlice';
import { selectDepartmentsInitialized } from '../../store/slices/departmentSlice';
import { selectEvaluationsInitialized } from '../../store/slices/evaluationSlice';
import LoadingSpinner from './LoadingSpinner';

const AppLoader = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const authInitialized = useSelector(selectAuthInitialized);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const usersInitialized = useSelector(selectUsersInitialized);
  const departmentsInitialized = useSelector(selectDepartmentsInitialized);
  const evaluationsInitialized = useSelector(selectEvaluationsInitialized);

  useEffect(() => {
    const checkInitialization = () => {
      // For public routes (login, register, etc.), we only need auth to be initialized
      const isPublicRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
      
      if (isPublicRoute) {
        if (authInitialized) {
          if (isAuthenticated) {
            // If user is authenticated on a public route, redirect to dashboard
            navigate('/dashboard');
          } else {
            setIsLoading(false);
          }
        }
        return;
      }

      // For protected routes, we need all data to be initialized
      if (isAuthenticated && authInitialized && user?.businessId) {
        const allDataInitialized = usersInitialized && departmentsInitialized && evaluationsInitialized;
        
        if (!allDataInitialized) {
          // If data isn't initialized, force a page reload
          console.log('🔄 Data not initialized, reloading page...');
          window.location.reload();
          return;
        }
        
        setIsLoading(false);
      } else if (authInitialized && !isAuthenticated) {
        // If not authenticated on a protected route, redirect to login
        navigate('/login');
      }
    };

    checkInitialization();
  }, [
    authInitialized,
    isAuthenticated,
    user?.businessId,
    usersInitialized,
    departmentsInitialized,
    evaluationsInitialized,
    location.pathname,
    navigate
  ]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <div className="mt-4 text-gray-600 dark:text-gray-400">
            <p className="text-lg font-semibold">Loading MirrorUp</p>
            <div className="mt-2 text-sm">
              {!authInitialized && <p>• Initializing authentication...</p>}
              {authInitialized && isAuthenticated && (
                <>
                  {!usersInitialized && <p>• Loading users...</p>}
                  {!departmentsInitialized && <p>• Loading departments...</p>}
                  {!evaluationsInitialized && <p>• Loading evaluations...</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AppLoader;
