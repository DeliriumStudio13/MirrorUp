import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
  limit,
  startAfter,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

// Helper function to safely convert Firebase Timestamps to ISO strings
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate ? timestamp.toDate().toISOString() : null;
};

// Helper function to convert all timestamp fields in data
const convertTimestampsInData = (data) => {
  if (!data) return {};
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    submittedAt: convertTimestamp(data.submittedAt),
    dueDate: convertTimestamp(data.dueDate),
    assignedDate: convertTimestamp(data.assignedDate),
    // Also convert timestamps in nested objects
    managerReview: data.managerReview ? {
      ...data.managerReview,
      lastSavedAt: convertTimestamp(data.managerReview.lastSavedAt),
      reviewedAt: convertTimestamp(data.managerReview.reviewedAt)
    } : null
  };
};

const initialState = {
  evaluations: [],
  templates: [],
  selectedEvaluation: null,
  selectedTemplate: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    pageSize: 10
  },
  filters: {
    status: 'all',
    evaluatee: 'all',
    evaluator: 'all',
    period: 'all',
    department: 'all'
  },
  isLoading: false,
  templatesLoading: false,
  error: null,
  initialized: false // Track if initial data load is complete
};

// Async thunks for Evaluations
export const fetchEvaluations = createAsyncThunk(
  'evaluations/fetchEvaluations',
  async ({ businessId, filters = {}, page = 1, pageSize = 10 }, { rejectWithValue }) => {
    try {
      // Simple collection query without any filters
      const evaluationQuery = query(
        collection(db, 'businesses', businessId, 'evaluations')
      );

      const querySnapshot = await getDocs(evaluationQuery);
      let evaluations = [];

      // Client-side filtering
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const evaluation = { 
          id: doc.id, 
          ...convertTimestampsInData(data)
        };
        
        // Apply all filters client-side
        if (
          // Status filter
          (!filters.status || filters.status === 'all' || evaluation.status === filters.status) &&
          // Evaluatee filter
          (!filters.evaluatee || filters.evaluatee === 'all' || evaluation.evaluateeId === filters.evaluatee) &&
          // Evaluator filter
          (!filters.evaluator || filters.evaluator === 'all' || evaluation.evaluatorId === filters.evaluator)
        ) {
          evaluations.push(evaluation);
        }
      });

      // Apply client-side pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedEvaluations = evaluations.slice(startIndex, endIndex);

      return {
        evaluations: paginatedEvaluations,
        page,
        pageSize,
        hasMore: endIndex < evaluations.length
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEvaluation = createAsyncThunk(
  'evaluations/fetchEvaluation',
  async ({ businessId, evaluationId }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const evaluationDoc = await getDoc(doc(db, 'businesses', businessId, 'evaluations', evaluationId));
      
      if (!evaluationDoc.exists()) {
        throw new Error('Evaluation not found');
      }

      const data = evaluationDoc.data();
      return { 
        id: evaluationDoc.id, 
        ...convertTimestampsInData(data)
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createEvaluation = createAsyncThunk(
  'evaluations/createEvaluation',
  async ({ businessId, ...evaluationData }, { rejectWithValue, getState }) => {
    try {
      // Check if there's a valid assignment for this evaluation
      const assignmentsRef = collection(db, 'businesses', businessId, 'evaluationAssignments');
      const assignmentQuery = query(
        assignmentsRef,
        where('evaluatorId', '==', evaluationData.evaluatorId),
        where('evaluateeId', '==', evaluationData.evaluateeId),
        where('active', '==', true)
      );

      const assignmentSnapshot = await getDocs(assignmentQuery);
      if (assignmentSnapshot.empty) {
        throw new Error('No valid assignment found for this evaluation. Please check assignments in Assignment Management.');
      }

      // 🚀 NEW: Use subcollection - businessId not stored in document
      const docRef = await addDoc(collection(db, 'businesses', businessId, 'evaluations'), {
        ...evaluationData,
        assignmentId: assignmentSnapshot.docs[0].id, // Store the assignment ID
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdDoc = await getDoc(docRef);
      const data = createdDoc.data();
      return { 
        id: createdDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        submittedAt: data.submittedAt?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateEvaluation = createAsyncThunk(
  'evaluations/updateEvaluation',
  async ({ businessId, evaluationId, updates }, { rejectWithValue }) => {
    try {
      console.log('🔄 Updating evaluation:', {
        businessId,
        evaluationId,
        updates
      });

      // 🚀 NEW: Use subcollection path
      const evaluationRef = doc(db, 'businesses', businessId, 'evaluations', evaluationId);
      
      // Get current evaluation to preserve existing data
      const currentDoc = await getDoc(evaluationRef);
      if (!currentDoc.exists()) {
        throw new Error('Evaluation not found');
      }

      const currentData = currentDoc.data();
      console.log('📋 Current evaluation data:', currentData);

      // Merge with existing data
      const updatedData = {
        ...currentData,
        ...updates,
        updatedAt: serverTimestamp()
      };

      console.log('📝 Updated evaluation data:', updatedData);

      // Update the document
      await updateDoc(evaluationRef, updatedData);

      console.log('✅ Successfully updated evaluation');

      // Get the updated document
      const updatedDoc = await getDoc(evaluationRef);
      const data = updatedDoc.data();
      return { 
        id: updatedDoc.id, 
        ...convertTimestampsInData(data)
      };
    } catch (error) {
      console.error('❌ Error updating evaluation:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return rejectWithValue(error.message);
    }
  }
);

export const deleteEvaluation = createAsyncThunk(
  'evaluations/deleteEvaluation',
  async ({ businessId, evaluationId }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      await deleteDoc(doc(db, 'businesses', businessId, 'evaluations', evaluationId));
      return evaluationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveEvaluationProgress = createAsyncThunk(
  'evaluations/saveEvaluationProgress',
  async ({ businessId, evaluationId, responses }, { rejectWithValue }) => {
    try {
      console.log('🔄 Saving evaluation progress for ID:', evaluationId);
      console.log('📝 Raw responses object:', responses);
      
      // 🚀 NEW: Use subcollection path
      const evaluationRef = doc(db, 'businesses', businessId, 'evaluations', evaluationId);
      
      // DEBUG: Check the current evaluation document to understand permission issue
      console.log('🔍 DEBUGGING: Checking current evaluation document...');
      const currentDoc = await getDoc(evaluationRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        console.log('📋 Current evaluation data:', {
          evaluateeId: currentData.evaluateeId,
          evaluatorId: currentData.evaluatorId, 
          status: currentData.status,
          businessId: currentData.businessId,
          createdBy: currentData.createdBy
        });
        console.log('👤 Current user trying to save:', responses.savedBy);
        console.log('✅ Permission check results:', {
          isEvaluatee: currentData.evaluateeId === responses.savedBy,
          isEvaluator: currentData.evaluatorId === responses.savedBy,
          currentStatus: currentData.status,
          statusAllowsUpdate: ['draft', 'in-progress'].includes(currentData.status)
        });
      } else {
        console.log('❌ Evaluation document does not exist!');
      }
      
      // Build complete responses object - same pattern as submitEvaluation
      const completeResponses = {
        selfAssessment: {
          freeTextQuestions: responses.freeTextQuestions || {},
          categoryResponses: responses.categoryResponses || {},
          savedBy: responses.savedBy,
          lastSavedAt: new Date().toISOString()
        }
      };
      
      console.log('🧹 Complete responses structure:', JSON.stringify(completeResponses, null, 2));
      
      // Try ultra-minimal update first
      console.log('🚀 Attempting minimal update...');
      
      try {
        // First try: Just update status (this should always work)
        await updateDoc(evaluationRef, {
          status: 'in-progress'
        });
        console.log('✅ Status update successful');
        
        // Second try: Add responses
        await updateDoc(evaluationRef, {
          responses: completeResponses,
          status: 'in-progress'
        });
        console.log('✅ Responses update successful');
        
      } catch (minimalError) {
        console.error('❌ Even minimal update failed:', minimalError);
        
        // Fallback: Try the original pattern
        await updateDoc(evaluationRef, {
          responses: completeResponses,
          status: 'in-progress',
          updatedAt: serverTimestamp()
        });
      }
      
      console.log('✅ Firebase update successful');

      // Get the updated document
      const updatedDoc = await getDoc(evaluationRef);
      const data = updatedDoc.data();
      return { 
        id: updatedDoc.id, 
        ...convertTimestampsInData(data)
      };
    } catch (error) {
      console.error('❌ DETAILED Save error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Also log what we were trying to save
      console.error('❌ Attempted to save:', {
        evaluationId,
        responses,
        userId: responses.savedBy
      });
      
      return rejectWithValue(`${error.code}: ${error.message}`);
    }
  }
);

export const submitEvaluation = createAsyncThunk(
  'evaluations/submitEvaluation',
  async ({ businessId, evaluationId, responses }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const evaluationRef = doc(db, 'businesses', businessId, 'evaluations', evaluationId);
      
      await updateDoc(evaluationRef, {
        responses,
        status: 'under-review',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(evaluationRef);
      const data = updatedDoc.data();
      return { 
        id: updatedDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        submittedAt: data.submittedAt?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveManagerReviewProgress = createAsyncThunk(
  'evaluations/saveManagerReviewProgress',
  async ({ businessId, evaluationId, managerReview }, { rejectWithValue }) => {
    try {
      console.log('🔄 Saving manager review progress:', {
        businessId,
        evaluationId,
        managerReview
      });

      // 🚀 NEW: Use subcollection path
      const evaluationRef = doc(db, 'businesses', businessId, 'evaluations', evaluationId);
      
      // Get current evaluation to preserve existing data
      const currentDoc = await getDoc(evaluationRef);
      if (!currentDoc.exists()) {
        throw new Error('Evaluation not found');
      }

      const currentData = currentDoc.data();
      console.log('📋 Current evaluation data:', currentData);

      // Convert any ISO strings to Firestore timestamps
      const currentManagerReview = currentData.managerReview || {};
      
      // Merge with existing manager review data
      const updatedManagerReview = {
        ...currentManagerReview,
        ...managerReview,
        lastSavedAt: serverTimestamp(),
        inProgress: true
      };

      console.log('📝 Updated manager review:', updatedManagerReview);

      // Update the document
      await updateDoc(evaluationRef, {
        managerReview: updatedManagerReview,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Successfully updated evaluation');

      // Get the updated document
      const updatedDoc = await getDoc(evaluationRef);
      const data = updatedDoc.data();
      return { 
        id: updatedDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        submittedAt: data.submittedAt?.toDate()?.toISOString() || null,
        dueDate: data.dueDate?.toDate()?.toISOString() || null,
        assignedDate: data.assignedDate?.toDate()?.toISOString() || null
      };
    } catch (error) {
      console.error('❌ Error saving manager review progress:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return rejectWithValue(error.message);
    }
  }
);

// Async thunks for Templates
export const fetchEvaluationTemplates = createAsyncThunk(
  'evaluations/fetchEvaluationTemplates',
  async ({ businessId, includeInactive = false }, { rejectWithValue }) => {
    try {
      // Simple collection query without any filters
      const templateQuery = query(
        collection(db, 'businesses', businessId, 'evaluationTemplates')
      );

      const querySnapshot = await getDocs(templateQuery);
      let templates = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Client-side filtering for active status
        if (!includeInactive && !data.isActive) {
          return; // Skip inactive templates if not including them
        }
        
        // Convert Firebase timestamps to ISO strings for Redux serialization
        templates.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
        });
      });
      
      // Client-side sorting by name
      templates.sort((a, b) => a.name.localeCompare(b.name));

      return templates;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEvaluationTemplate = createAsyncThunk(
  'evaluations/fetchEvaluationTemplate',  
  async ({ businessId, templateId }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const templateDoc = await getDoc(doc(db, 'businesses', businessId, 'evaluationTemplates', templateId));
      
      if (!templateDoc.exists()) {
        throw new Error('Template not found');
      }

      const data = templateDoc.data();
      return { 
        id: templateDoc.id, 
        ...data,
        // Convert Firebase Timestamps to ISO strings for serialization
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createEvaluationTemplate = createAsyncThunk(
  'evaluations/createEvaluationTemplate',
  async ({ businessId, ...templateData }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection - businessId not stored in document
      const docRef = await addDoc(collection(db, 'businesses', businessId, 'evaluationTemplates'), {
        ...templateData,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdDoc = await getDoc(docRef);
      const data = createdDoc.data();
      return { 
        id: createdDoc.id, 
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateEvaluationTemplate = createAsyncThunk(
  'evaluations/updateEvaluationTemplate',
  async ({ businessId, templateId, updates }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const templateRef = doc(db, 'businesses', businessId, 'evaluationTemplates', templateId);
      
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(templateRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteEvaluationTemplate = createAsyncThunk(
  'evaluations/deleteEvaluationTemplate',
  async ({ businessId, templateId }, { rejectWithValue }) => {
    try {
      // 🚀 NEW: Use subcollection path
      const templateRef = doc(db, 'businesses', businessId, 'evaluationTemplates', templateId);
      
      // Actually delete the document from Firestore permanently
      await deleteDoc(templateRef);

      return templateId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Evaluation slice
const evaluationSlice = createSlice({
  name: 'evaluations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearEvaluations: (state) => {
      state.evaluations = [];
      state.selectedEvaluation = null;
      state.pagination = initialState.pagination;
    },
    clearTemplates: (state) => {
      state.templates = [];
      state.selectedTemplate = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.pagination = { ...initialState.pagination };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination = { ...initialState.pagination };
    },
    setSelectedEvaluation: (state, action) => {
      state.selectedEvaluation = action.payload;
    },
    clearSelectedEvaluation: (state) => {
      state.selectedEvaluation = null;
    },
    setSelectedTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    clearSelectedTemplate: (state) => {
      state.selectedTemplate = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    updateEvaluationInList: (state, action) => {
      const index = state.evaluations.findIndex(evaluation => evaluation.id === action.payload.id);
      if (index !== -1) {
        state.evaluations[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Evaluations
      .addCase(fetchEvaluations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvaluations.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.evaluations = action.payload.evaluations;
        } else {
          state.evaluations.push(...action.payload.evaluations);
        }
        state.pagination = {
          currentPage: action.payload.page,
          pageSize: action.payload.pageSize,
          hasMore: action.payload.hasMore,
          lastVisible: null // Don't store Firebase QueryDocumentSnapshot in Redux
        };
        state.error = null;
        state.initialized = true; // Mark as initialized after successful fetch
      })
      .addCase(fetchEvaluations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Single Evaluation
      .addCase(fetchEvaluation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvaluation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedEvaluation = action.payload;
        state.error = null;
      })
      .addCase(fetchEvaluation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create Evaluation
      .addCase(createEvaluation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvaluation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.evaluations.unshift(action.payload);
        state.selectedEvaluation = action.payload;
        state.error = null;
      })
      .addCase(createEvaluation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Evaluation
      .addCase(updateEvaluation.pending, (state) => {
        state.error = null;
      })
      .addCase(updateEvaluation.fulfilled, (state, action) => {
        const index = state.evaluations.findIndex(evaluation => evaluation.id === action.payload.id);
        if (index !== -1) {
          state.evaluations[index] = action.payload;
        }
        if (state.selectedEvaluation && state.selectedEvaluation.id === action.payload.id) {
          state.selectedEvaluation = action.payload;
        }
        state.error = null;
      })
      .addCase(updateEvaluation.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Delete Evaluation
      .addCase(deleteEvaluation.fulfilled, (state, action) => {
        state.evaluations = state.evaluations.filter(evaluation => evaluation.id !== action.payload);
        if (state.selectedEvaluation && state.selectedEvaluation.id === action.payload) {
          state.selectedEvaluation = null;
        }
      })
      
      // Save Evaluation Progress
      .addCase(saveEvaluationProgress.fulfilled, (state, action) => {
        const index = state.evaluations.findIndex(evaluation => evaluation.id === action.payload.id);
        if (index !== -1) {
          state.evaluations[index] = action.payload;
        }
        if (state.selectedEvaluation && state.selectedEvaluation.id === action.payload.id) {
          state.selectedEvaluation = action.payload;
        }
      })
      
      // Save Manager Review Progress
      .addCase(saveManagerReviewProgress.fulfilled, (state, action) => {
        const index = state.evaluations.findIndex(evaluation => evaluation.id === action.payload.id);
        if (index !== -1) {
          state.evaluations[index] = action.payload;
        }
        if (state.selectedEvaluation && state.selectedEvaluation.id === action.payload.id) {
          state.selectedEvaluation = action.payload;
        }
      })
      
      // Submit Evaluation
      .addCase(submitEvaluation.fulfilled, (state, action) => {
        const index = state.evaluations.findIndex(evaluation => evaluation.id === action.payload.id);
        if (index !== -1) {
          state.evaluations[index] = action.payload;
        }
        if (state.selectedEvaluation && state.selectedEvaluation.id === action.payload.id) {
          state.selectedEvaluation = action.payload;
        }
      })
      
      // Templates
      .addCase(fetchEvaluationTemplates.pending, (state) => {
        state.templatesLoading = true;
      })
      .addCase(fetchEvaluationTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchEvaluationTemplates.rejected, (state, action) => {
        state.templatesLoading = false;
        state.error = action.payload;
      })
      
      .addCase(fetchEvaluationTemplate.fulfilled, (state, action) => {
        state.selectedTemplate = action.payload;
      })
      
      .addCase(createEvaluationTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
        state.selectedTemplate = action.payload;
      })
      
      .addCase(updateEvaluationTemplate.fulfilled, (state, action) => {
        const index = state.templates.findIndex(template => template.id === action.payload.id);
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
        if (state.selectedTemplate && state.selectedTemplate.id === action.payload.id) {
          state.selectedTemplate = action.payload;
        }
      })
      
      .addCase(deleteEvaluationTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter(template => template.id !== action.payload);
        if (state.selectedTemplate && state.selectedTemplate.id === action.payload) {
          state.selectedTemplate = null;
        }
      });
  },
});

export const {
  clearError,
  clearEvaluations,
  clearTemplates,
  setFilters,
  clearFilters,
  setSelectedEvaluation,
  clearSelectedEvaluation,
  setSelectedTemplate,
  clearSelectedTemplate,
  setPagination,
  updateEvaluationInList
} = evaluationSlice.actions;

// Selectors
export const selectEvaluations = (state) => state.evaluations.evaluations;
export const selectEvaluationTemplates = (state) => state.evaluations.templates;
export const selectSelectedEvaluation = (state) => state.evaluations.selectedEvaluation;
export const selectSelectedTemplate = (state) => state.evaluations.selectedTemplate;
export const selectEvaluationsPagination = (state) => state.evaluations.pagination;
export const selectEvaluationsFilters = (state) => state.evaluations.filters;
export const selectEvaluationsLoading = (state) => state.evaluations.isLoading;
export const selectTemplatesLoading = (state) => state.evaluations.templatesLoading;
export const selectEvaluationsError = (state) => state.evaluations.error;
export const selectEvaluationsInitialized = (state) => state.evaluations.initialized;

// Evaluation migration utility
export const fixEvaluationAssignedBy = createAsyncThunk(
  'evaluations/fixEvaluationAssignedBy',
  async (businessId, { rejectWithValue }) => {
    try {
      console.log('🔧 Starting evaluation assignedBy migration for business:', businessId);
      
      // Get all evaluations
      const evaluationsRef = collection(db, 'businesses', businessId, 'evaluations');
      const q = query(evaluationsRef);
      const querySnapshot = await getDocs(q);
      
      let fixedCount = 0;
      
      // Get all users to map IDs to names
      const usersRef = collection(db, 'businesses', businessId, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const userMap = {};
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        userMap[doc.id] = `${data.profile?.firstName || ''} ${data.profile?.lastName || ''}`.trim();
      });
      
      for (const docSnapshot of querySnapshot.docs) {
        const evaluation = docSnapshot.data();
        
        // Check if assignedBy is a user ID
        if (evaluation.assignedBy && userMap[evaluation.assignedBy]) {
          console.log(`🔧 Fixing assignedBy for evaluation ${docSnapshot.id}`);
          
          await updateDoc(docSnapshot.ref, {
            assignedBy: userMap[evaluation.assignedBy],
            updatedAt: serverTimestamp()
          });
          
          fixedCount++;
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} evaluations with ID-based assignedBy`);
      return { fixedCount };
      
    } catch (error) {
      console.error('❌ Error fixing evaluation assignedBy:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Template migration utility
export const fixTemplateQuestionTypes = createAsyncThunk(
  'evaluations/fixTemplateQuestionTypes',
  async (businessId, { rejectWithValue }) => {
    try {
      console.log('🔧 Starting template question type migration for business:', businessId);
      
      // 🚀 NEW: Use subcollection - no businessId filter needed!
      const templatesRef = collection(db, 'businesses', businessId, 'evaluationTemplates');
      const q = query(templatesRef);
      const querySnapshot = await getDocs(q);
      
      let fixedCount = 0;
      
      for (const docSnapshot of querySnapshot.docs) {
        const template = docSnapshot.data();
        let needsUpdate = false;
        
        // Check and fix category questions
        const updatedCategories = template.categories?.map(category => {
          const updatedQuestions = category.questions?.map(question => {
            if (!question.type || (question.type !== 'rating' && question.type !== 'dualRating' && question.type !== 'text')) {
              console.log('🔧 Fixing question type for:', question.text);
              needsUpdate = true;
              return {
                ...question,
                type: 'dualRating' // Default to dualRating for consistency
              };
            }
            return question;
          }) || [];
          
          return {
            ...category,
            questions: updatedQuestions
          };
        }) || [];
        
        // If template needs update, save it
        if (needsUpdate) {
          console.log('🔧 Updating template:', template.name);
          // 🚀 NEW: Use subcollection path
          const templateRef = doc(db, 'businesses', businessId, 'evaluationTemplates', docSnapshot.id);
          await updateDoc(templateRef, {
            categories: updatedCategories,
            updatedAt: serverTimestamp()
          });
          fixedCount++;
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} templates with missing question types`);
      return { fixedCount };
      
    } catch (error) {
      console.error('❌ Error fixing template question types:', error);
      return rejectWithValue(error.message);
    }
  }
);

export default evaluationSlice.reducer;
