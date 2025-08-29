import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const initialState = {
  evaluationAssignments: [],
  bonusAssignments: [],
  isLoading: false,
  error: null,
};

// ===========================================
// EVALUATION ASSIGNMENTS
// ===========================================

export const fetchEvaluationAssignments = createAsyncThunk(
  'assignments/fetchEvaluationAssignments',
  async (businessId, { rejectWithValue }) => {
    try {
      const assignmentsQuery = query(
        collection(db, 'evaluationAssignments'),
        where('businessId', '==', businessId),
        where('active', '==', true),
        orderBy('assignedDate', 'desc')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        assignments.push({ id: doc.id, ...doc.data() });
      });

      return assignments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createEvaluationAssignment = createAsyncThunk(
  'assignments/createEvaluationAssignment',
  async (assignmentData, { rejectWithValue }) => {
    try {
      const docRef = await addDoc(collection(db, 'evaluationAssignments'), {
        ...assignmentData,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdDoc = await getDoc(docRef);
      return { id: createdDoc.id, ...createdDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateEvaluationAssignment = createAsyncThunk(
  'assignments/updateEvaluationAssignment',
  async ({ assignmentId, updates }, { rejectWithValue }) => {
    try {
      const assignmentRef = doc(db, 'evaluationAssignments', assignmentId);
      
      await updateDoc(assignmentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(assignmentRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteEvaluationAssignment = createAsyncThunk(
  'assignments/deleteEvaluationAssignment',
  async (assignmentId, { rejectWithValue }) => {
    try {
      // Soft delete - mark as inactive
      const assignmentRef = doc(db, 'evaluationAssignments', assignmentId);
      await updateDoc(assignmentRef, {
        active: false,
        updatedAt: serverTimestamp()
      });

      return assignmentId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ===========================================
// BONUS ASSIGNMENTS
// ===========================================

export const fetchBonusAssignments = createAsyncThunk(
  'assignments/fetchBonusAssignments',
  async (businessId, { rejectWithValue }) => {
    try {
      const assignmentsQuery = query(
        collection(db, 'bonusAssignments'),
        where('businessId', '==', businessId),
        where('active', '==', true),
        orderBy('assignedDate', 'desc')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        assignments.push({ id: doc.id, ...doc.data() });
      });

      return assignments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createBonusAssignment = createAsyncThunk(
  'assignments/createBonusAssignment',
  async (assignmentData, { rejectWithValue }) => {
    try {
      const docRef = await addDoc(collection(db, 'bonusAssignments'), {
        ...assignmentData,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdDoc = await getDoc(docRef);
      return { id: createdDoc.id, ...createdDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateBonusAssignment = createAsyncThunk(
  'assignments/updateBonusAssignment',
  async ({ assignmentId, updates }, { rejectWithValue }) => {
    try {
      const assignmentRef = doc(db, 'bonusAssignments', assignmentId);
      
      await updateDoc(assignmentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(assignmentRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteBonusAssignment = createAsyncThunk(
  'assignments/deleteBonusAssignment',
  async (assignmentId, { rejectWithValue }) => {
    try {
      // Soft delete - mark as inactive
      const assignmentRef = doc(db, 'bonusAssignments', assignmentId);
      await updateDoc(assignmentRef, {
        active: false,
        updatedAt: serverTimestamp()
      });

      return assignmentId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export const bulkCreateEvaluationAssignments = createAsyncThunk(
  'assignments/bulkCreateEvaluationAssignments',
  async ({ assignments, businessId, assignedBy }, { rejectWithValue }) => {
    try {
      const createdAssignments = [];
      
      for (const assignment of assignments) {
        const docRef = await addDoc(collection(db, 'evaluationAssignments'), {
          businessId,
          evaluatorId: assignment.evaluatorId,
          evaluateeId: assignment.evaluateeId,
          assignedBy,
          assignedDate: new Date().toISOString(),
          assignmentType: assignment.assignmentType || 'permanent',
          notes: assignment.notes || '',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        const createdDoc = await getDoc(docRef);
        createdAssignments.push({ id: createdDoc.id, ...createdDoc.data() });
      }

      return createdAssignments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Assignment slice
const assignmentSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAssignments: (state) => {
      state.evaluationAssignments = [];
      state.bonusAssignments = [];
    },
    // Utility for optimistic updates
    addEvaluationAssignmentOptimistic: (state, action) => {
      state.evaluationAssignments.unshift(action.payload);
    },
    removeEvaluationAssignmentOptimistic: (state, action) => {
      state.evaluationAssignments = state.evaluationAssignments.filter(
        assignment => assignment.id !== action.payload
      );
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Evaluation Assignments
      .addCase(fetchEvaluationAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvaluationAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.evaluationAssignments = action.payload;
        state.error = null;
      })
      .addCase(fetchEvaluationAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create Evaluation Assignment
      .addCase(createEvaluationAssignment.fulfilled, (state, action) => {
        state.evaluationAssignments.unshift(action.payload);
      })
      .addCase(createEvaluationAssignment.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Update Evaluation Assignment
      .addCase(updateEvaluationAssignment.fulfilled, (state, action) => {
        const index = state.evaluationAssignments.findIndex(
          assignment => assignment.id === action.payload.id
        );
        if (index !== -1) {
          state.evaluationAssignments[index] = action.payload;
        }
      })
      
      // Delete Evaluation Assignment
      .addCase(deleteEvaluationAssignment.fulfilled, (state, action) => {
        state.evaluationAssignments = state.evaluationAssignments.filter(
          assignment => assignment.id !== action.payload
        );
      })
      
      // Fetch Bonus Assignments
      .addCase(fetchBonusAssignments.pending, (state) => {
        if (state.bonusAssignments.length === 0) state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBonusAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bonusAssignments = action.payload;
        state.error = null;
      })
      .addCase(fetchBonusAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create Bonus Assignment
      .addCase(createBonusAssignment.fulfilled, (state, action) => {
        state.bonusAssignments.unshift(action.payload);
      })
      
      // Update Bonus Assignment
      .addCase(updateBonusAssignment.fulfilled, (state, action) => {
        const index = state.bonusAssignments.findIndex(
          assignment => assignment.id === action.payload.id
        );
        if (index !== -1) {
          state.bonusAssignments[index] = action.payload;
        }
      })
      
      // Delete Bonus Assignment
      .addCase(deleteBonusAssignment.fulfilled, (state, action) => {
        state.bonusAssignments = state.bonusAssignments.filter(
          assignment => assignment.id !== action.payload
        );
      })
      
      // Bulk Create Evaluation Assignments
      .addCase(bulkCreateEvaluationAssignments.fulfilled, (state, action) => {
        state.evaluationAssignments.unshift(...action.payload);
      });
  },
});

export const {
  clearError,
  clearAssignments,
  addEvaluationAssignmentOptimistic,
  removeEvaluationAssignmentOptimistic
} = assignmentSlice.actions;

// Selectors
export const selectEvaluationAssignments = (state) => state.assignments.evaluationAssignments;
export const selectBonusAssignments = (state) => state.assignments.bonusAssignments;
export const selectAssignmentsLoading = (state) => state.assignments.isLoading;
export const selectAssignmentsError = (state) => state.assignments.error;

// Utility selectors with memoization

export const selectEvaluationAssignmentsByEvaluator = createSelector(
  [selectEvaluationAssignments, (state, evaluatorId) => evaluatorId],
  (assignments, evaluatorId) => assignments.filter(assignment => assignment.evaluatorId === evaluatorId)
);

export const selectEvaluationAssignmentsByEvaluatee = createSelector(
  [selectEvaluationAssignments, (state, evaluateeId) => evaluateeId],
  (assignments, evaluateeId) => assignments.filter(assignment => assignment.evaluateeId === evaluateeId)
);

export const selectBonusAssignmentsByAllocator = createSelector(
  [selectBonusAssignments, (state, allocatorId) => allocatorId],
  (assignments, allocatorId) => assignments.filter(assignment => assignment.allocatorId === allocatorId)
);

export const selectBonusAssignmentsByRecipient = createSelector(
  [selectBonusAssignments, (state, recipientId) => recipientId],
  (assignments, recipientId) => assignments.filter(assignment => assignment.recipientId === recipientId)
);

export default assignmentSlice.reducer;
