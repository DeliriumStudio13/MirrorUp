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
      // 🚀 NEW: Use subcollection - no queries needed at all!  
      const assignmentsQuery = query(
        collection(db, 'businesses', businessId, 'evaluationAssignments')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const convertedData = {
          id: doc.id,
          ...data,
          // Convert Firebase Timestamps to ISO strings for serialization
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          assignedDate: data.assignedDate?.toDate?.()?.toISOString() || new Date().toISOString(),
          dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
          // Ensure required fields have default values
          active: data.active ?? true,
          assignmentType: data.assignmentType || 'permanent',
          notes: data.notes || '',
          expiresDate: data.expiresDate || null
        };
        assignments.push(convertedData);
      });

      // Filter active assignments and sort by assignedDate in JavaScript
      return assignments
        .filter(assignment => assignment.active === true)
        .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createEvaluationAssignment = createAsyncThunk(
  'assignments/createEvaluationAssignment',
  async ({ businessId, ...assignmentData }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection - businessId not stored in document
      // Check for existing assignment
      const existingQuery = query(
        collection(db, 'businesses', businessId, 'evaluationAssignments'),
        where('evaluatorId', '==', assignmentData.evaluatorId),
        where('evaluateeId', '==', assignmentData.evaluateeId),
        where('active', '==', true)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        throw new Error('An active assignment already exists for this evaluator and evaluatee');
      }

      // Prepare assignment data with required fields
      const assignmentDoc = {
        ...assignmentData,
        active: true,
        assignedDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignmentType: assignmentData.assignmentType || 'permanent',
        notes: assignmentData.notes || '',
        expiresDate: assignmentData.expiresDate || null
      };

      const docRef = await addDoc(collection(db, 'businesses', businessId, 'evaluationAssignments'), assignmentDoc);

      const createdDoc = await getDoc(docRef);
      const data = createdDoc.data();
      return { 
        id: createdDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateEvaluationAssignment = createAsyncThunk(
  'assignments/updateEvaluationAssignment',
  async ({ businessId, assignmentId, updates }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const assignmentRef = doc(db, 'businesses', businessId, 'evaluationAssignments', assignmentId);
      
      await updateDoc(assignmentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(assignmentRef);
      const data = updatedDoc.data();
      return { 
        id: updatedDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteEvaluationAssignment = createAsyncThunk(
  'assignments/deleteEvaluationAssignment',
  async ({ businessId, assignmentId }, { rejectWithValue }) => {
    try {
      // Soft delete - mark as inactive
      // 🚀 NEW: Use subcollection path
      const assignmentRef = doc(db, 'businesses', businessId, 'evaluationAssignments', assignmentId);
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
      // 🚀 NEW: Use subcollection - no queries needed at all!
      const assignmentsQuery = query(
        collection(db, 'businesses', businessId, 'bonusAssignments')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const convertedData = {
          id: doc.id,
          ...data,
          // Convert Firebase Timestamps to ISO strings for serialization
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          assignedDate: data.assignedDate?.toDate?.()?.toISOString() || new Date().toISOString(),
          dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
          // Ensure required fields have default values
          active: data.active ?? true,
          assignmentType: data.assignmentType || 'permanent',
          notes: data.notes || '',
          expiresDate: data.expiresDate || null
        };
        assignments.push(convertedData);
      });

      // Filter active assignments and sort by assignedDate in JavaScript
      return assignments
        .filter(assignment => assignment.active === true)
        .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createBonusAssignment = createAsyncThunk(
  'assignments/createBonusAssignment',
  async ({ businessId, ...assignmentData }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection - businessId not stored in document
      // Check for existing assignment
      const existingQuery = query(
        collection(db, 'businesses', businessId, 'bonusAssignments'),
        where('allocatorId', '==', assignmentData.allocatorId),
        where('recipientId', '==', assignmentData.recipientId),
        where('active', '==', true)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        throw new Error('An active assignment already exists for this allocator and recipient');
      }

      // Prepare assignment data with required fields
      const assignmentDoc = {
        ...assignmentData,
        active: true,
        assignedDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignmentType: assignmentData.assignmentType || 'permanent',
        notes: assignmentData.notes || '',
        budgetLimit: assignmentData.budgetLimit || null,
        expiresDate: assignmentData.expiresDate || null
      };

      const docRef = await addDoc(collection(db, 'businesses', businessId, 'bonusAssignments'), assignmentDoc);

      const createdDoc = await getDoc(docRef);
      const data = createdDoc.data();
      return { 
        id: createdDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateBonusAssignment = createAsyncThunk(
  'assignments/updateBonusAssignment',
  async ({ businessId, assignmentId, updates }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const assignmentRef = doc(db, 'businesses', businessId, 'bonusAssignments', assignmentId);
      
      await updateDoc(assignmentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Return updated assignment
      const updatedDoc = await getDoc(assignmentRef);
      const data = updatedDoc.data();
      return {
        id: updatedDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteBonusAssignment = createAsyncThunk(
  'assignments/deleteBonusAssignment',
  async ({ businessId, assignmentId }, { rejectWithValue }) => {
    try {
      // Soft delete - mark as inactive
      // 🚀 NEW: Use subcollection path  
      const assignmentRef = doc(db, 'businesses', businessId, 'bonusAssignments', assignmentId);
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
      
      // Check for existing assignments
      const existingAssignments = await Promise.all(
        assignments.map(assignment => 
          getDocs(query(
            collection(db, 'businesses', businessId, 'evaluationAssignments'),
            where('evaluatorId', '==', assignment.evaluatorId),
            where('evaluateeId', '==', assignment.evaluateeId),
            where('active', '==', true)
          ))
        )
      );

      // Filter out assignments that already exist
      const newAssignments = assignments.filter((_, index) => existingAssignments[index].empty);

      if (newAssignments.length === 0) {
        throw new Error('All assignments already exist');
      }

      for (const assignment of newAssignments) {
        // 🚀 NEW: Use subcollection - businessId not stored in document
        const docRef = await addDoc(collection(db, 'businesses', businessId, 'evaluationAssignments'), {
          evaluatorId: assignment.evaluatorId,
          evaluateeId: assignment.evaluateeId,
          assignedBy,
          assignedDate: serverTimestamp(),
          assignmentType: assignment.assignmentType || 'permanent',
          notes: assignment.notes || '',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        const createdDoc = await getDoc(docRef);
        const data = createdDoc.data();
        createdAssignments.push({ 
          id: createdDoc.id, 
          ...data,
          // Convert Firebase Timestamps to ISO strings for serialization
          createdAt: data.createdAt?.toDate()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
          assignedDate: data.assignedDate?.toDate()?.toISOString() || null,
          dueDate: data.dueDate?.toDate()?.toISOString() || null
        });
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
  (assignments, evaluatorId) => assignments.filter(assignment => 
    assignment.evaluatorId === evaluatorId && 
    assignment.active === true
  )
);

export const selectEvaluationAssignmentsByEvaluatee = createSelector(
  [selectEvaluationAssignments, (state, evaluateeId) => evaluateeId],
  (assignments, evaluateeId) => assignments.filter(assignment => 
    assignment.evaluateeId === evaluateeId && 
    assignment.active === true
  )
);

export const selectBonusAssignmentsByAllocator = createSelector(
  [selectBonusAssignments, (state, allocatorId) => allocatorId],
  (assignments, allocatorId) => assignments.filter(assignment => 
    assignment.allocatorId === allocatorId && 
    assignment.active === true
  )
);

export const selectBonusAssignmentsByRecipient = createSelector(
  [selectBonusAssignments, (state, recipientId) => recipientId],
  (assignments, recipientId) => assignments.filter(assignment => 
    assignment.recipientId === recipientId && 
    assignment.active === true
  )
);

export default assignmentSlice.reducer;
