import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { authService, databaseService, auth, db } from '../../firebase/services';

// Get initial auth state
const getInitialAuthState = () => {
  return {
    user: null,
    firebaseUser: null,
    businessData: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading true until Firebase auth state is determined
    error: null,
    initialized: false,
  };
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Sign in using auth service
      const result = await authService.signIn(email, password);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const firebaseUser = result.user;
      
      // 🚀 NEW: First get businessId from mapping table
      const mappingResult = await databaseService.getById('userBusinessMap', firebaseUser.uid);
      
      if (!mappingResult.success) {
        throw new Error('User business mapping not found');
      }
      
      const { businessId } = mappingResult.data;
      
      // 🚀 NEW: Get user data from subcollection
      const userResult = await databaseService.getById(`businesses/${businessId}/users`, firebaseUser.uid);
      
      if (!userResult.success) {
        throw new Error('User profile not found');
      }
      
      const userData = userResult.data;
      
      // Get business data
      const businessResult = await databaseService.getById('businesses', businessId);
      const businessData = businessResult.success ? businessResult.data : null;
      
      // 🚀 NEW: Update last login in subcollection
      await databaseService.update(`businesses/${businessId}/users`, firebaseUser.uid, {
        lastLogin: databaseService.serverTimestamp()
      });
      
      return {
        firebaseUser: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName,
        },
        user: userData,
        businessData
      };
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const registerBusiness = createAsyncThunk(
  'auth/registerBusiness',
  async (registrationData, { rejectWithValue }) => {
    try {
      // Create Firebase Auth user directly
      const signUpResult = await authService.createUser(
        registrationData.adminEmail, 
        registrationData.password,
        {
          displayName: `${registrationData.firstName} ${registrationData.lastName}`
        }
      );
      
      if (!signUpResult.success) {
        throw new Error(signUpResult.error);
      }
      
      const firebaseUser = signUpResult.user;

      // Generate business ID
      const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create business document
      const businessData = {
        name: registrationData.businessName,
        email: registrationData.businessEmail,
        phone: registrationData.phone || null,
        industry: registrationData.industry,
        settings: {
          evaluationCycle: 'annual',
          bonusCalculation: 'performance-based',
          defaultCurrency: 'USD',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        isActive: true,
        createdAt: databaseService.serverTimestamp(),
        updatedAt: databaseService.serverTimestamp()
      };

      await databaseService.createWithId('businesses', businessId, businessData);

      // Create admin user document  
      // 🚀 NEW: No businessId in document - it's implicit in the subcollection path!
      const userData = {
        profile: {
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          email: registrationData.adminEmail,
          phone: registrationData.phone || null,
          avatar: null
        },
        role: 'admin',
        employeeInfo: {
          employeeId: `EMP_${Date.now()}`,
          department: null,
          position: 'Administrator',
          hireDate: databaseService.serverTimestamp(),
          salary: null,
          manager: null
        },
        permissions: {
          canManageUsers: true,
          canManageDepartments: true,
          canManageEvaluations: true,
          canViewAnalytics: true,
          canManageSettings: true,
          canCalculateBonuses: true
        },
        isActive: true,
        lastLogin: null,
        createdAt: databaseService.serverTimestamp(),
        updatedAt: databaseService.serverTimestamp()
      };

      // 🚀 NEW: Save to subcollection path
      await databaseService.createWithId(`businesses/${businessId}/users`, firebaseUser.uid, userData);
      
      // 🚀 NEW: Create user-business mapping for auth lookups
      await databaseService.createWithId('userBusinessMap', firebaseUser.uid, {
        businessId,
        email: registrationData.adminEmail,
        role: 'admin',
        createdAt: databaseService.serverTimestamp()
      });

      // Get the created documents
      const [finalUserResult, finalBusinessResult] = await Promise.all([
        databaseService.getById(`businesses/${businessId}/users`, firebaseUser.uid),
        databaseService.getById('businesses', businessId)
      ]);

      return {
        firebaseUser: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName,
        },
        user: finalUserResult.success ? finalUserResult.data : null,
        businessData: finalBusinessResult.success ? finalBusinessResult.data : null
      };
    } catch (error) {
      console.error('Registration error:', error);
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const user = auth.user;
      
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      // Update user document in Firestore
      await updateDoc(doc(db, 'businesses', user.businessId, 'users', user.id), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      // Update Firebase Auth profile if display name changed
      if (profileData.profile && (profileData.profile.firstName || profileData.profile.lastName)) {
        const displayName = `${profileData.profile.firstName || user.profile.firstName} ${profileData.profile.lastName || user.profile.lastName}`;
        await authService.updateUserProfile({ displayName });
      }
      
      // Get updated user data
      const userDoc = await getDoc(doc(db, 'businesses', user.businessId, 'users', user.id));
      const userData = { id: userDoc.id, businessId: user.businessId, ...userDoc.data() };
      
      return userData;
    } catch (error) {
      return rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Re-authenticate user first
      const signInResult = await authService.signIn(auth.currentUser.email, currentPassword);
      
      if (!signInResult.success) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      const updateResult = await authService.updateUserPassword(newPassword);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }
      
      return { message: 'Password changed successfully' };
    } catch (error) {
      return rejectWithValue(error.message || 'Password change failed');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const result = await authService.sendPasswordResetEmail(email);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { message: result.message };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send reset email');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ oobCode, newPassword }, { rejectWithValue }) => {
    try {
      const result = await authService.confirmPasswordReset(oobCode, newPassword);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { message: result.message };
    } catch (error) {
      return rejectWithValue(error.message || 'Password reset failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authService.signOut();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { message: result.message };
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// Auth state listener
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch }) => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // User is signed in
            // First get businessId from mapping table
            const mappingDoc = await getDoc(doc(db, 'userBusinessMap', firebaseUser.uid));
            
            if (!mappingDoc.exists()) {
              throw new Error('User business mapping not found');
            }
            
            const { businessId } = mappingDoc.data();
            
            // Get user data from subcollection
            const userDoc = await getDoc(doc(db, 'businesses', businessId, 'users', firebaseUser.uid));
            
            if (userDoc.exists()) {
              const rawUserData = userDoc.data();
              
              // Convert Firebase Timestamps to ISO strings for Redux serialization
              const userData = {
                id: userDoc.id,
                businessId, // Add businessId to user data
                ...rawUserData,
                employeeInfo: rawUserData.employeeInfo ? {
                  ...rawUserData.employeeInfo,
                  hireDate: rawUserData.employeeInfo.hireDate?.toDate ? 
                    rawUserData.employeeInfo.hireDate.toDate().toISOString() : 
                    rawUserData.employeeInfo.hireDate
                } : undefined,
                createdAt: rawUserData.createdAt?.toDate ? 
                  rawUserData.createdAt.toDate().toISOString() : rawUserData.createdAt,
                updatedAt: rawUserData.updatedAt?.toDate ? 
                  rawUserData.updatedAt.toDate().toISOString() : rawUserData.updatedAt,
                lastLogin: rawUserData.lastLogin?.toDate ? 
                  rawUserData.lastLogin.toDate().toISOString() : rawUserData.lastLogin
              };
              
              // Get business data
              const businessDoc = await getDoc(doc(db, 'businesses', businessId));
              let businessData = null;
              
              if (businessDoc.exists()) {
                const rawBusinessData = businessDoc.data();
                businessData = {
                  id: businessDoc.id,
                  ...rawBusinessData,
                  createdAt: rawBusinessData.createdAt?.toDate ? 
                    rawBusinessData.createdAt.toDate().toISOString() : rawBusinessData.createdAt,
                  updatedAt: rawBusinessData.updatedAt?.toDate ? 
                    rawBusinessData.updatedAt.toDate().toISOString() : rawBusinessData.updatedAt
                };
              }
              
              dispatch(authSlice.actions.setAuthData({
                firebaseUser: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  emailVerified: firebaseUser.emailVerified,
                  displayName: firebaseUser.displayName,
                },
                user: userData,
                businessData
              }));
            } else {
              // Firebase user exists but no Firestore document
              dispatch(authSlice.actions.setUnauthenticated());
            }
          } else {
            // User is signed out
            dispatch(authSlice.actions.setUnauthenticated());
          }
          
          dispatch(authSlice.actions.setInitialized());
          resolve();
        } catch (error) {
          console.error('Auth state change error:', error);
          dispatch(authSlice.actions.setError(error.message));
          dispatch(authSlice.actions.setInitialized());
          resolve();
        }
      });

      // Return unsubscribe function
      return unsubscribe;
    });
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialAuthState(),
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthData: (state, action) => {
      const { firebaseUser, user, businessData } = action.payload;
      state.firebaseUser = firebaseUser;
      state.user = user;
      state.businessData = businessData;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    setUnauthenticated: (state) => {
      state.firebaseUser = null;
      state.user = null;
      state.businessData = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setInitialized: (state) => {
      state.initialized = true;
      state.isLoading = false;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.firebaseUser = action.payload.firebaseUser;
        state.businessData = action.payload.businessData;
        state.isAuthenticated = true;
        state.error = null;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.initialized = true;
      })
      
      // Register Business
      .addCase(registerBusiness.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerBusiness.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.firebaseUser = action.payload.firebaseUser;
        state.businessData = action.payload.businessData;
        state.isAuthenticated = true;
        state.error = null;
        state.initialized = true;
      })
      .addCase(registerBusiness.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.initialized = true;
      })
      
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        return {
          ...getInitialAuthState(),
          initialized: true,
          isLoading: false
        };
      });
  },
});

export const { 
  clearError, 
  setAuthData, 
  setUnauthenticated, 
  setInitialized, 
  setError,
  updateUserData 
} = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectFirebaseUser = (state) => state.auth.firebaseUser;
export const selectBusinessData = (state) => state.auth.businessData;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthInitialized = (state) => state.auth.initialized;

export default authSlice.reducer;