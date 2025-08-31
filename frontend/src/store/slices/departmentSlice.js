import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const initialState = {
  departments: [],
  selectedDepartment: null,
  hierarchy: [],
  isLoading: false,
  error: null,
  initialized: false,
};

// Async thunks
export const fetchDepartments = createAsyncThunk(
  'departments/fetchDepartments',
  async (businessId, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection - no businessId filter needed!
      const departmentQuery = query(
        collection(db, 'businesses', businessId, 'departments')
      );

      // Get all departments
      const departmentSnapshot = await getDocs(departmentQuery);
      const departments = departmentSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Get all users to calculate employee counts
      const usersQuery = query(collection(db, 'businesses', businessId, 'users'));
      const usersSnapshot = await getDocs(usersQuery);

      // Calculate employee counts
      const departmentCounts = {};
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.isActive && userData.employeeInfo?.department) {
          departmentCounts[userData.employeeInfo.department] = (departmentCounts[userData.employeeInfo.department] || 0) + 1;
        }
      });

      // Update department counts
      const updatedDepartments = departments.map(dept => ({
        ...dept,
        employeeCount: departmentCounts[dept.id] || dept.employeeCount || 0
      }));

      // Update counts in Firestore
      const updatePromises = updatedDepartments.map(dept => {
        if (dept.employeeCount !== (departmentCounts[dept.id] || 0)) {
          const deptRef = doc(db, 'businesses', businessId, 'departments', dept.id);
          return updateDoc(deptRef, {
            employeeCount: departmentCounts[dept.id] || 0,
            updatedAt: serverTimestamp()
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      return updatedDepartments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDepartment = createAsyncThunk(
  'departments/fetchDepartment',
  async ({ businessId, departmentId }, { rejectWithValue }) => {
    try {
      // Use correct subcollection path
      const departmentDoc = await getDoc(doc(db, 'businesses', businessId, 'departments', departmentId));
      
      if (!departmentDoc.exists()) {
        throw new Error('Department not found');
      }

      return { id: departmentDoc.id, ...departmentDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createDepartment = createAsyncThunk(
  'departments/createDepartment',
  async ({ departmentData, businessId }, { rejectWithValue }) => {
    try {
      // Check if department with same name already exists
      // Simple query without compound filters
      const existingQuery = query(
        collection(db, 'businesses', businessId, 'departments')
      );
      
      const existingDepts = await getDocs(existingQuery);
      const departmentExists = existingDepts.docs.some(doc => {
        const data = doc.data();
        return data.name === departmentData.name && data.isActive === true;
      });
      
      if (departmentExists) {
        throw new Error('A department with this name already exists');
      }

      // 🚀 NEW: Use subcollection - businessId not stored in document
      const docRef = await addDoc(collection(db, 'businesses', businessId, 'departments'), {
        name: departmentData.name,
        description: departmentData.description || null,
        parentDepartment: departmentData.parentDepartment || null,
        manager: departmentData.manager || null,
        budget: departmentData.budget ? parseFloat(departmentData.budget) : null,
        location: departmentData.location || null,
        isActive: true,
        employeeCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Return the created department data immediately
      return { 
        id: docRef.id, 
        name: departmentData.name,
        description: departmentData.description || null,
        parentDepartment: departmentData.parentDepartment || null,
        manager: departmentData.manager || null,
        budget: departmentData.budget ? parseFloat(departmentData.budget) : null,
        location: departmentData.location || null,
        businessId,
        isActive: true,
        employeeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  'departments/updateDepartment',
  async ({ departmentId, departmentData, businessId }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const departmentRef = doc(db, 'businesses', businessId, 'departments', departmentId);
      
      const updateData = {
        name: departmentData.name,
        description: departmentData.description || null,
        parentDepartment: departmentData.parentDepartment || null,
        manager: departmentData.manager || null,
        budget: departmentData.budget ? parseFloat(departmentData.budget) : null,
        location: departmentData.location || null,
        isActive: departmentData.isActive,
        updatedAt: serverTimestamp()
      };

      await updateDoc(departmentRef, updateData);

      // Get current department data to preserve employee count
      const currentDept = await getDoc(departmentRef);
      const currentData = currentDept.exists() ? currentDept.data() : {};

      // Return updated department data
      return { 
        id: departmentId, 
        ...updateData,
        businessId,
        employeeCount: currentData.employeeCount || 0, // Preserve existing employee count
        updatedAt: new Date()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  'departments/deleteDepartment',
  async ({ departmentId, businessId }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const departmentRef = doc(db, 'businesses', businessId, 'departments', departmentId);
      
      // Soft delete - mark as inactive
      await updateDoc(departmentRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });

      return departmentId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDepartmentHierarchy = createAsyncThunk(
  'departments/fetchDepartmentHierarchy',
  async (businessId, { rejectWithValue }) => {
    try {
      // Get all departments for the business without filters
      const departmentQuery = query(
        collection(db, 'businesses', businessId, 'departments')
      );

      const querySnapshot = await getDocs(departmentQuery);
      const departments = [];

      querySnapshot.forEach((doc) => {
        departments.push({ id: doc.id, ...doc.data() });
      });

      // Sort departments by name in JavaScript (since we removed orderBy)
      departments.sort((a, b) => a.name.localeCompare(b.name));

      // Build hierarchy tree
      const departmentMap = new Map();
      const rootDepartments = [];

      // Create a map of all departments
      departments.forEach(dept => {
        departmentMap.set(dept.id, {
          ...dept,
          children: []
        });
      });

      // Build the hierarchy
      departments.forEach(dept => {
        const deptObj = departmentMap.get(dept.id);
        
        if (dept.parentDepartment) {
          const parent = departmentMap.get(dept.parentDepartment);
          if (parent) {
            parent.children.push(deptObj);
          }
        } else {
          rootDepartments.push(deptObj);
        }
      });

      return rootDepartments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDepartmentEmployees = createAsyncThunk(
  'departments/fetchDepartmentEmployees',
  async ({ businessId, departmentId }, { rejectWithValue }) => {
    try {
      // Simple query without filters
      const employeesQuery = query(
        collection(db, 'businesses', businessId, 'users')
      );

      const querySnapshot = await getDocs(employeesQuery);
      let employees = [];

      // Client-side filtering and sorting
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (
          data.employeeInfo?.department === departmentId && 
          data.isActive === true
        ) {
          employees.push({ id: doc.id, ...data });
        }
      });

      // Client-side sorting by first name
      employees.sort((a, b) => {
        const aName = a.profile?.firstName || '';
        const bName = b.profile?.firstName || '';
        return aName.localeCompare(bName);
      });

      return { departmentId, employees };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Department slice
const departmentSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDepartments: (state) => {
      state.departments = [];
      state.selectedDepartment = null;
      state.hierarchy = [];
    },
    setSelectedDepartment: (state, action) => {
      state.selectedDepartment = action.payload;
    },
    clearSelectedDepartment: (state) => {
      state.selectedDepartment = null;
    },
    updateDepartmentEmployees: (state, action) => {
      const { departmentId, employees } = action.payload;
      if (state.selectedDepartment && state.selectedDepartment.id === departmentId) {
        state.selectedDepartment.employees = employees;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Departments
      .addCase(fetchDepartments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.departments = action.payload;
        state.error = null;
        state.initialized = true;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Single Department
      .addCase(fetchDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedDepartment = action.payload;
        state.error = null;
      })
      .addCase(fetchDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create Department
      .addCase(createDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.departments.push(action.payload);
        state.error = null;
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Department
      .addCase(updateDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.departments.findIndex(dept => dept.id === action.payload.id);
        if (index !== -1) {
          state.departments[index] = action.payload;
        }
        if (state.selectedDepartment && state.selectedDepartment.id === action.payload.id) {
          state.selectedDepartment = action.payload;
        }
        state.error = null;
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Delete Department
      .addCase(deleteDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.departments = state.departments.filter(dept => dept.id !== action.payload);
        if (state.selectedDepartment && state.selectedDepartment.id === action.payload) {
          state.selectedDepartment = null;
        }
        state.error = null;
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Department Hierarchy
      .addCase(fetchDepartmentHierarchy.fulfilled, (state, action) => {
        state.hierarchy = action.payload;
      })
      
      // Fetch Department Employees
      .addCase(fetchDepartmentEmployees.fulfilled, (state, action) => {
        const { departmentId, employees } = action.payload;
        if (state.selectedDepartment && state.selectedDepartment.id === departmentId) {
          state.selectedDepartment.employees = employees;
        }
      });
  },
});

export const {
  clearError,
  clearDepartments,
  setSelectedDepartment,
  clearSelectedDepartment,
  updateDepartmentEmployees
} = departmentSlice.actions;

// Selectors
export const selectDepartments = (state) => state.departments.departments;
export const selectSelectedDepartment = (state) => state.departments.selectedDepartment;
export const selectDepartmentHierarchy = (state) => state.departments.hierarchy;
export const selectDepartmentsLoading = (state) => state.departments.isLoading;
export const selectDepartmentsError = (state) => state.departments.error;
export const selectDepartmentsInitialized = (state) => state.departments.initialized;

export default departmentSlice.reducer;

