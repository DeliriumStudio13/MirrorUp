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
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
