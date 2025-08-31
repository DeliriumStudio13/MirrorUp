import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { databaseService, functionsService, authService } from '../../firebase/services';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp
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
  initialized: false,
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (businessId, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection - no businessId filter needed!
      const usersRef = collection(db, 'businesses', businessId, 'users');
      const q = query(usersRef);  // No where clause needed - already scoped to business!
      
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
  async ({ businessId, userId }, { rejectWithValue }) => {
    try {
      const result = await databaseService.getById(`businesses/${businessId}/users`, userId);
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
      // 🚀 NEW: No businessId in document - it's implicit in the subcollection path!
      const userDocument = {
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
          hireDate: userData.hireDate ? (userData.hireDate.toDate ? userData.hireDate.toDate().toISOString() : userData.hireDate) : null,
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

      // 🚀 NEW: Save to subcollection path!
      await setDoc(doc(db, 'businesses', businessId, 'users', firebaseUser.uid), userDocument);
      
      // 🚀 NEW: Create user-business mapping for auth lookups
      await setDoc(doc(db, 'userBusinessMap', firebaseUser.uid), {
        businessId,
        email: userData.email,
        role: userData.role,
        createdAt: serverTimestamp()
      });

      console.log('User document created in Firestore');

      // Update department employee count if department is assigned
      if (userData.department) {
        const { doc: firestoreDoc, updateDoc, increment, getDoc } = await import('firebase/firestore');
        const departmentRef = firestoreDoc(db, 'businesses', businessId, 'departments', userData.department);
        
        // Check if department exists before updating
        const departmentSnap = await getDoc(departmentRef);
        if (departmentSnap.exists()) {
          await updateDoc(departmentRef, {
            employeeCount: increment(1),
            updatedAt: serverTimestamp()
          });
          console.log('Department employee count updated');
        } else {
          console.warn('Department not found:', userData.department);
        }
      }

      // Clean up secondary app
      const { deleteApp } = await import('firebase/app');
      await deleteApp(secondaryApp);
      console.log('Secondary app cleaned up');

      // Return the created user data (admin session is preserved!)
      const createdUser = {
        id: firebaseUser.uid,
        ...userDocument,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
  async ({ userId, userData, businessId, currentUser }, { rejectWithValue }) => {
    try {
      // Get current user data to check if department changed
      const oldUserResult = await databaseService.getById(`businesses/${businessId}/users`, userId);
      const oldUser = oldUserResult.success ? oldUserResult.data : null;
      
      const oldDepartment = oldUser?.employeeInfo?.department;
      const newDepartment = userData.department || null;
      
      // Update user data in Firestore
      const updateData = {
        'profile.firstName': userData.firstName,
        'profile.lastName': userData.lastName,
        'profile.email': userData.email,
        'profile.phone': userData.phone || null,
        role: userData.role,
        'employeeInfo.department': newDepartment,
        'employeeInfo.position': userData.position,
        isActive: userData.isActive,
        updatedAt: databaseService.serverTimestamp()
      };

      await databaseService.update(`businesses/${businessId}/users`, userId, updateData);
      
      // Handle department count changes
      if (oldDepartment !== newDepartment) {
        const { doc: firestoreDoc, updateDoc, increment, serverTimestamp, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');
        
        // Decrease count from old department
        if (oldDepartment) {
          const oldDeptRef = firestoreDoc(db, 'businesses', businessId, 'departments', oldDepartment);
          const oldDeptSnap = await getDoc(oldDeptRef);
          if (oldDeptSnap.exists()) {
            await updateDoc(oldDeptRef, {
              employeeCount: increment(-1),
              updatedAt: serverTimestamp()
            });
            console.log('Decreased employee count in old department:', oldDepartment);
          }
        }
        
        // Increase count in new department
        if (newDepartment) {
          const newDeptRef = firestoreDoc(db, 'businesses', businessId, 'departments', newDepartment);
          const newDeptSnap = await getDoc(newDeptRef);
          if (newDeptSnap.exists()) {
            await updateDoc(newDeptRef, {
              employeeCount: increment(1),
              updatedAt: serverTimestamp()
            });
            console.log('Increased employee count in new department:', newDepartment);
          }
        }
      }
      
      // Return updated user data
      const updatedResult = await databaseService.getById(`businesses/${businessId}/users`, userId);
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
      // Get user's department before deletion
      const userDoc = await getDoc(doc(db, 'businesses', businessId, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const departmentId = userData.employeeInfo?.department;

      // Delete user from Firebase Auth
      await authService.deleteUserAccount(userId);

      // Delete user document and mapping
      await Promise.all([
        deleteDoc(doc(db, 'businesses', businessId, 'users', userId)),
        deleteDoc(doc(db, 'userBusinessMap', userId))
      ]);

      // Update department employee count if user was assigned to a department
      if (departmentId) {
        const departmentRef = doc(db, 'businesses', businessId, 'departments', departmentId);
        const departmentDoc = await getDoc(departmentRef);
        
        if (departmentDoc.exists()) {
          await updateDoc(departmentRef, {
            employeeCount: increment(-1),
            updatedAt: serverTimestamp()
          });
        }
      }

      return userId;
    } catch (error) {
      console.error('Delete user error:', error);
      return rejectWithValue(error.message || 'Failed to delete user');
    }
  }
);

// Utility function to fix department employee counts
export const fixDepartmentCounts = createAsyncThunk(
  'users/fixDepartmentCounts',
  async (businessId, { rejectWithValue }) => {
    try {
      console.log('🔧 Starting department count fix...');
      
      const { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');
      
      // Get all users for this business
      // 🚀 NEW: Use subcollection - no businessId filter needed!
      const usersRef = collection(db, 'businesses', businessId, 'users');
      const usersQuery = query(usersRef);
      const usersSnapshot = await getDocs(usersQuery);
      
      // Get all departments for this business
      // 🚀 NEW: Use subcollection - no businessId filter needed!
      const departmentsRef = collection(db, 'businesses', businessId, 'departments');
      const departmentsQuery = query(departmentsRef);
      const departmentsSnapshot = await getDocs(departmentsQuery);
      
      // Count employees per department
      const departmentCounts = {};
      
      // Initialize all departments with 0 count
      departmentsSnapshot.docs.forEach(deptDoc => {
        departmentCounts[deptDoc.id] = 0;
      });
      
      // Count actual employee assignments
      usersSnapshot.docs.forEach(userDoc => {
        const userData = userDoc.data();
        const departmentId = userData.employeeInfo?.department;
        if (departmentId && departmentCounts.hasOwnProperty(departmentId)) {
          departmentCounts[departmentId]++;
        }
      });
      
      // Update each department's employee count
      const updatePromises = Object.entries(departmentCounts).map(([deptId, count]) => {
        // 🚀 NEW: Use subcollection path
        const deptRef = doc(db, 'businesses', businessId, 'departments', deptId);
        return updateDoc(deptRef, {
          employeeCount: count,
          updatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(updatePromises);
      
      console.log('🔧 Department counts fixed:', departmentCounts);
      return departmentCounts;
    } catch (error) {
      console.error('Error fixing department counts:', error);
      return rejectWithValue(error.message);
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
        state.initialized = true;
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
export const selectUsersInitialized = (state) => state.users.initialized;

export default userSlice.reducer;
