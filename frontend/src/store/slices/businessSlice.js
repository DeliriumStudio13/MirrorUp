import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const initialState = {
  businessData: null,
  dashboard: {
    stats: null,
    recentActivity: [],
    isLoading: false
  },
  settings: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBusinessData = createAsyncThunk(
  'business/fetchBusinessData',
  async (businessId, { rejectWithValue }) => {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      
      if (!businessDoc.exists()) {
        throw new Error('Business not found');
      }
      
      return { id: businessDoc.id, ...businessDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateBusinessData = createAsyncThunk(
  'business/updateBusinessData',
  async ({ businessId, updates }, { rejectWithValue }) => {
    try {
      const businessRef = doc(db, 'businesses', businessId);
      
      await updateDoc(businessRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // Get updated business data
      const updatedDoc = await getDoc(businessRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'business/fetchDashboardStats',
  async (businessId, { rejectWithValue }) => {
    try {
      // This would typically call a Cloud Function to get aggregated stats
      // For now, return mock data
      return {
        totalEmployees: 45,
        totalDepartments: 8,
        activeEvaluations: 12,
        completedEvaluations: 33,
        overdueEvaluations: 3,
        avgPerformanceScore: 78.5,
        evaluationCompletionRate: 87
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  'business/fetchRecentActivity',
  async ({ businessId, limit = 10 }, { rejectWithValue }) => {
    try {
      // TODO: Implement Firebase integration for recent activities
      // Return empty array for now - will be implemented with real data
      return [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Business slice
const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearBusinessData: (state) => {
      state.businessData = null;
      state.dashboard = {
        stats: null,
        recentActivity: [],
        isLoading: false
      };
      state.settings = null;
    },
    updateBusinessSettings: (state, action) => {
      if (state.businessData) {
        state.businessData.settings = {
          ...state.businessData.settings,
          ...action.payload
        };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Business Data
      .addCase(fetchBusinessData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBusinessData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.businessData = action.payload;
        state.error = null;
      })
      .addCase(fetchBusinessData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Business Data
      .addCase(updateBusinessData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBusinessData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.businessData = action.payload;
        state.error = null;
      })
      .addCase(updateBusinessData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.dashboard.isLoading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboard.isLoading = false;
        state.dashboard.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.dashboard.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Recent Activity
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.dashboard.recentActivity = action.payload;
      });
  },
});

export const { 
  clearError, 
  clearBusinessData, 
  updateBusinessSettings 
} = businessSlice.actions;

// Selectors
export const selectBusinessData = (state) => state.business.businessData;
export const selectBusinessLoading = (state) => state.business.isLoading;
export const selectBusinessError = (state) => state.business.error;
export const selectDashboardStats = (state) => state.business.dashboard.stats;
export const selectDashboardLoading = (state) => state.business.dashboard.isLoading;
export const selectRecentActivity = (state) => state.business.dashboard.recentActivity;

export default businessSlice.reducer;
