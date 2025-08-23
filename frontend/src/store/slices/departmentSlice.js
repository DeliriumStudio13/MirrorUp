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
};

// Async thunks
export const fetchDepartments = createAsyncThunk(
  'departments/fetchDepartments',
  async (businessId, { rejectWithValue }) => {
    try {
      const departmentQuery = query(
        collection(db, 'departments'),
        where('businessId', '==', businessId)
      );

      const querySnapshot = await getDocs(departmentQuery);
      const departments = [];

      querySnapshot.forEach((doc) => {
        departments.push({ id: doc.id, ...doc.data() });
      });

      return departments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDepartment = createAsyncThunk(
  'departments/fetchDepartment',
  async (departmentId, { rejectWithValue }) => {
    try {
      const departmentDoc = await getDoc(doc(db, 'departments', departmentId));
      
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
      const existingQuery = query(
        collection(db, 'departments'),
        where('businessId', '==', businessId),
        where('name', '==', departmentData.name),
        where('isActive', '==', true)
      );
      
      const existingDepts = await getDocs(existingQuery);
      if (!existingDepts.empty) {
        throw new Error('A department with this name already exists');
      }

      const docRef = await addDoc(collection(db, 'departments'), {
        name: departmentData.name,
        description: departmentData.description || null,
        parentDepartment: departmentData.parentDepartment || null,
        manager: departmentData.manager || null,
        budget: departmentData.budget ? parseFloat(departmentData.budget) : null,
        location: departmentData.location || null,
        businessId,
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
      const departmentRef = doc(db, 'departments', departmentId);
      
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

      // Return updated department data
      return { 
        id: departmentId, 
        ...updateData,
        businessId,
        employeeCount: 0, // Keep existing employee count
        updatedAt: new Date()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  'departments/deleteDepartment',
  async (departmentId, { rejectWithValue }) => {
    try {
      const departmentRef = doc(db, 'departments', departmentId);
      
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
      // Get all active departments for the business
      const departmentQuery = query(
        collection(db, 'departments'),
        where('businessId', '==', businessId),
        where('isActive', '==', true),
        orderBy('name')
      );

      const querySnapshot = await getDocs(departmentQuery);
      const departments = [];

      querySnapshot.forEach((doc) => {
        departments.push({ id: doc.id, ...doc.data() });
      });

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
  async (departmentId, { rejectWithValue }) => {
    try {
      const employeesQuery = query(
        collection(db, 'users'),
        where('employeeInfo.department', '==', departmentId),
        where('isActive', '==', true),
        orderBy('profile.firstName')
      );

      const querySnapshot = await getDocs(employeesQuery);
      const employees = [];

      querySnapshot.forEach((doc) => {
        employees.push({ id: doc.id, ...doc.data() });
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

export default departmentSlice.reducer;

