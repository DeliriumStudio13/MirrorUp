import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import businessSlice from './slices/businessSlice';
import userSlice from './slices/userSlice';
import departmentSlice from './slices/departmentSlice';
import evaluationSlice from './slices/evaluationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    business: businessSlice,
    users: userSlice,
    departments: departmentSlice,
    evaluations: evaluationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          // Ignore Firebase auth actions
          'auth/login/fulfilled',
          'auth/register/fulfilled',
          'auth/updateProfile/fulfilled',
          // Ignore Firebase evaluation actions
          'evaluations/fetchEvaluationTemplates/fulfilled',
          'evaluations/fetchEvaluationTemplate/fulfilled',
          'evaluations/createEvaluationTemplate/fulfilled',
          'evaluations/updateEvaluationTemplate/fulfilled',
          'evaluations/fetchEvaluations/fulfilled',
          'evaluations/fetchEvaluation/fulfilled',
          'evaluations/createEvaluation/fulfilled',
          'evaluations/updateEvaluation/fulfilled',
          'evaluations/submitEvaluation/fulfilled',
          // Ignore other Firebase-related actions
          'users/fetchUsers/fulfilled',
          'users/createUser/fulfilled',
          'departments/fetchDepartments/fulfilled',
          'departments/createDepartment/fulfilled',
        ],
        ignoredPaths: [
          // Ignore Firebase Timestamp objects in state
          'evaluations.templates',
          'evaluations.evaluations',
          'evaluations.selectedTemplate',
          'evaluations.selectedEvaluation',
          'users.users',
          'departments.departments',
          'auth.user',
          'auth.businessData',
          'auth.businessData.updatedAt',
          'auth.businessData.createdAt',
          'users.users.createdAt',
          'users.users.updatedAt',
          'departments.departments.createdAt', 
          'departments.departments.updatedAt',
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
