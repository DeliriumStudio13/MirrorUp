import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { databaseService, functionsService } from '../../firebase/services';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const initialState = {
  users: [],
  selectedUser: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    pageSize: 10
  },
  filters: {
    search: '',
    role: 'all',
    department: 'all',
    isActive: true
  },
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (businessId, { rejectWithValue }) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('businessId', '==', businessId)
      );
      
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { users, total: users.length, page: 1, totalPages: 1, pageSize: users.length };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUser = createAsyncThunk(
  'users/fetchUser',
  async (userId, { rejectWithValue }) => {
    try {
      const result = await databaseService.getById('users', userId);
      if (!result.success) {
        throw new Error(result.error || 'User not found');
      }
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async ({ userData, businessId }, { rejectWithValue }) => {
    try {
      // Import Firebase modules
      const { initializeApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { auth, db } = await import('../../firebase/config');

      console.log('Creating user with data:', userData);

      // Verify admin is logged in
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) {
        throw new Error('Admin must be logged in to create users');
      }

      console.log('Current admin:', { email: currentAdmin.email, uid: currentAdmin.uid });

      // Create a secondary Firebase app instance for user creation
      // This won't interfere with the admin's session
      const secondaryAppConfig = {
        apiKey: "AIzaSyD8ACB8656g7lSdMA5h4nU9bj37hRaMjGQ",
        authDomain: "mirrorup-e71a0.firebaseapp.com",
        projectId: "mirrorup-e71a0",
        storageBucket: "mirrorup-e71a0.firebasestorage.app",
        messagingSenderId: "852717548637",
        appId: "1:852717548637:web:bf2e1aaa2a0615ebbc89b4"
      };

      const secondaryApp = initializeApp(secondaryAppConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);

      // Create user with secondary auth instance (won't affect main session)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        userData.email, 
        userData.password
      );
      const firebaseUser = userCredential.user;

      console.log('Firebase Auth user created:', firebaseUser.uid);

      // Generate employee ID
      const employeeId = `EMP_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create user document in Firestore (using main db instance)
      const userDocument = {
        businessId,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone || null,
          avatar: null
        },
        role: userData.role,
        employeeInfo: {
          employeeId,
          department: userData.department || null,
          position: userData.position,
          hireDate: new Date(userData.hireDate),
          salary: null,
          manager: null
        },
        permissions: {
          canManageUsers: userData.role === 'admin' || userData.role === 'hr',
          canManageDepartments: userData.role === 'admin' || userData.role === 'hr',
          canManageEvaluations: userData.role === 'admin' || userData.role === 'hr' || userData.role === 'manager' || userData.role === 'supervisor',
          canViewAnalytics: userData.role !== 'employee',
          canManageSettings: userData.role === 'admin',
          canCalculateBonuses: userData.role === 'admin' || userData.role === 'hr'
        },
        isActive: true,
        lastLogin: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDocument);

      console.log('User document created in Firestore');

      // Clean up secondary app
      const { deleteApp } = await import('firebase/app');
      await deleteApp(secondaryApp);
      console.log('Secondary app cleaned up');

      // Return the created user data (admin session is preserved!)
      const createdUser = {
        id: firebaseUser.uid,
        ...userDocument,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return createdUser;
    } catch (error) {
      console.error('Create user error:', error);
      let errorMessage = 'Failed to create user';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'A user with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak (minimum 6 characters)';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ userId, userData, businessId }, { rejectWithValue }) => {
    try {
      // Update user data in Firestore
      const updateData = {
        'profile.firstName': userData.firstName,
        'profile.lastName': userData.lastName,
        'profile.email': userData.email,
        'profile.phone': userData.phone || null,
        role: userData.role,
        'employeeInfo.department': userData.department || null,
        'employeeInfo.position': userData.position,
        isActive: userData.isActive,
        updatedAt: databaseService.serverTimestamp()
      };

      await databaseService.update('users', userId, updateData);
      
      // Return updated user data
      const updatedResult = await databaseService.getById('users', userId);
      return updatedResult.success ? updatedResult.data : null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async ({ userId, businessId }, { rejectWithValue }) => {
    try {
      // Call Cloud Function to delete user (handles Firebase Auth deletion)
      const result = await functionsService.call('userDeleteUser', {
        userId,
        businessId
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return userId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete user');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'users/searchUsers',
  async ({ businessId, searchTerm, filters }, { rejectWithValue }) => {
    try {
      // Simple client-side search implementation
      // In a real app, this would be server-side search
      return [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserSubordinates = createAsyncThunk(
  'users/fetchUserSubordinates',
  async (managerId, { rejectWithValue }) => {
    try {
      // TODO: Implement subordinates fetching
      return [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const bulkImportUsers = createAsyncThunk(
  'users/bulkImportUsers',
  async (usersData, { rejectWithValue }) => {
    try {
      // TODO: Implement bulk import functionality
      return { successful: [], failed: [] };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Users slice
const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUsers: (state) => {
      state.users = [];
      state.selectedUser = null;
      state.pagination = initialState.pagination;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.pagination.currentPage = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.currentPage = 1;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.users;
        state.pagination = {
          currentPage: action.payload.page,
          totalPages: action.payload.totalPages,
          totalItems: action.payload.total,
          pageSize: action.payload.pageSize
        };
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Single User
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedUser = action.payload;
        state.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create User
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
        state.error = null;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.selectedUser && state.selectedUser.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
        state.error = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.filter(user => user.id !== action.payload);
        if (state.selectedUser && state.selectedUser.id === action.payload) {
          state.selectedUser = null;
        }
        state.error = null;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Search Users
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })
      
      // Fetch User Subordinates
      .addCase(fetchUserSubordinates.fulfilled, (state, action) => {
        if (state.selectedUser) {
          state.selectedUser.subordinates = action.payload;
        }
      })
      
      // Bulk Import Users
      .addCase(bulkImportUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkImportUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add successful imports to users list
        if (action.payload.successful) {
          action.payload.successful.forEach(user => {
            state.users.unshift(user);
          });
        }
        state.error = null;
      })
      .addCase(bulkImportUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearUsers,
  setFilters,
  clearFilters,
  setSelectedUser,
  clearSelectedUser,
  setPagination
} = userSlice.actions;

// Selectors
export const selectUsers = (state) => state.users.users;
export const selectSelectedUser = (state) => state.users.selectedUser;
export const selectUsersPagination = (state) => state.users.pagination;
export const selectUsersFilters = (state) => state.users.filters;
export const selectUsersLoading = (state) => state.users.isLoading;
export const selectUsersError = (state) => state.users.error;

export default userSlice.reducer;
