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

const initialState = {
  evaluations: [],
  templates: [],
  selectedEvaluation: null,
  selectedTemplate: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    pageSize: 10,
    lastVisible: null
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
};

// Async thunks for Evaluations
export const fetchEvaluations = createAsyncThunk(
  'evaluations/fetchEvaluations',
  async ({ businessId, filters = {}, page = 1, pageSize = 10 }, { rejectWithValue }) => {
    try {
      let evaluationQuery = query(
        collection(db, 'evaluations'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        evaluationQuery = query(evaluationQuery, where('status', '==', filters.status));
      }

      if (filters.evaluatee && filters.evaluatee !== 'all') {
        evaluationQuery = query(evaluationQuery, where('evaluateeId', '==', filters.evaluatee));
      }

      if (filters.evaluator && filters.evaluator !== 'all') {
        evaluationQuery = query(evaluationQuery, where('evaluatorId', '==', filters.evaluator));
      }

      // Pagination
      if (page > 1 && filters.lastVisible) {
        evaluationQuery = query(evaluationQuery, startAfter(filters.lastVisible));
      }

      evaluationQuery = query(evaluationQuery, limit(pageSize));

      const querySnapshot = await getDocs(evaluationQuery);
      const evaluations = [];
      let lastVisible = null;

      querySnapshot.forEach((doc) => {
        evaluations.push({ id: doc.id, ...doc.data() });
        lastVisible = doc;
      });

      return {
        evaluations,
        page,
        pageSize,
        hasMore: evaluations.length === pageSize,
        lastVisible
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEvaluation = createAsyncThunk(
  'evaluations/fetchEvaluation',
  async (evaluationId, { rejectWithValue }) => {
    try {
      const evaluationDoc = await getDoc(doc(db, 'evaluations', evaluationId));
      
      if (!evaluationDoc.exists()) {
        throw new Error('Evaluation not found');
      }

      return { id: evaluationDoc.id, ...evaluationDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createEvaluation = createAsyncThunk(
  'evaluations/createEvaluation',
  async (evaluationData, { rejectWithValue }) => {
    try {
      const docRef = await addDoc(collection(db, 'evaluations'), {
        ...evaluationData,
        status: 'draft',
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

export const updateEvaluation = createAsyncThunk(
  'evaluations/updateEvaluation',
  async ({ evaluationId, updates }, { rejectWithValue }) => {
    try {
      const evaluationRef = doc(db, 'evaluations', evaluationId);
      
      await updateDoc(evaluationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(evaluationRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteEvaluation = createAsyncThunk(
  'evaluations/deleteEvaluation',
  async (evaluationId, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, 'evaluations', evaluationId));
      return evaluationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveEvaluationProgress = createAsyncThunk(
  'evaluations/saveEvaluationProgress',
  async ({ evaluationId, responses }, { rejectWithValue }) => {
    try {
      const evaluationRef = doc(db, 'evaluations', evaluationId);
      
      await updateDoc(evaluationRef, {
        responses: {
          selfAssessment: {
            ...responses,
            lastSavedAt: new Date().toISOString()
          }
        },
        status: 'in-progress',
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(evaluationRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitEvaluation = createAsyncThunk(
  'evaluations/submitEvaluation',
  async ({ evaluationId, responses }, { rejectWithValue }) => {
    try {
      const evaluationRef = doc(db, 'evaluations', evaluationId);
      
      await updateDoc(evaluationRef, {
        responses,
        status: 'under-review',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(evaluationRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveManagerReviewProgress = createAsyncThunk(
  'evaluations/saveManagerReviewProgress',
  async ({ evaluationId, managerReview }, { rejectWithValue }) => {
    try {
      const evaluationRef = doc(db, 'evaluations', evaluationId);
      
      await updateDoc(evaluationRef, {
        managerReview: {
          ...managerReview,
          lastSavedAt: new Date().toISOString(),
          inProgress: true
        },
        updatedAt: serverTimestamp()
      });

      const updatedDoc = await getDoc(evaluationRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error saving manager review progress:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Async thunks for Templates
export const fetchEvaluationTemplates = createAsyncThunk(
  'evaluations/fetchEvaluationTemplates',
  async ({ businessId, includeInactive = false }, { rejectWithValue }) => {
    try {
      // Simplified query to work while indexes are building
      let templateQuery = query(
        collection(db, 'evaluationTemplates'),
        where('businessId', '==', businessId)
      );
      
      // We'll filter isActive in JavaScript temporarily
      // Once indexes are ready, we can restore the orderBy('name') query

      const querySnapshot = await getDocs(templateQuery);
      const templates = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter in JavaScript while indexes are building
        if (!includeInactive && !data.isActive) {
          return; // Skip inactive templates if not including them
        }
        
        // Convert Firebase timestamps to Date objects for consistency
        templates.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
        });
      });
      
      // Sort by name in JavaScript temporarily
      templates.sort((a, b) => a.name.localeCompare(b.name));

      return templates;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEvaluationTemplate = createAsyncThunk(
  'evaluations/fetchEvaluationTemplate',
  async (templateId, { rejectWithValue }) => {
    try {
      const templateDoc = await getDoc(doc(db, 'evaluationTemplates', templateId));
      
      if (!templateDoc.exists()) {
        throw new Error('Template not found');
      }

      return { id: templateDoc.id, ...templateDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createEvaluationTemplate = createAsyncThunk(
  'evaluations/createEvaluationTemplate',
  async (templateData, { rejectWithValue }) => {
    try {
      const docRef = await addDoc(collection(db, 'evaluationTemplates'), {
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
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateEvaluationTemplate = createAsyncThunk(
  'evaluations/updateEvaluationTemplate',
  async ({ templateId, updates }, { rejectWithValue }) => {
    try {
      const templateRef = doc(db, 'evaluationTemplates', templateId);
      
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
  async (templateId, { rejectWithValue }) => {
    try {
      const templateRef = doc(db, 'evaluationTemplates', templateId);
      
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

// Template migration utility
export const fixTemplateQuestionTypes = createAsyncThunk(
  'evaluations/fixTemplateQuestionTypes',
  async (businessId, { rejectWithValue }) => {
    try {
      console.log('🔧 Starting template question type migration for business:', businessId);
      
      const templatesRef = collection(db, 'evaluationTemplates');
      const q = query(templatesRef, where('businessId', '==', businessId));
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
          const templateRef = doc(db, 'evaluationTemplates', docSnapshot.id);
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
