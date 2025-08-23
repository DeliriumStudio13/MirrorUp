import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Loading states
  isLoading: false,
  loadingMessage: '',
  
  // Sidebar state
  sidebarOpen: true,
  
  // Modals
  modals: {
    createUser: false,
    editUser: false,
    deleteUser: false,
    createDepartment: false,
    editDepartment: false,
    deleteDepartment: false,
    createEvaluation: false,
    evaluationDetails: false,
    orgChart: false,
    bonusCalculation: false,
    settings: false,
  },
  
  // Current modal data
  modalData: null,
  
  // Notifications
  notifications: [],
  
  // Filters and search
  filters: {
    users: {
      role: 'all',
      department: 'all',
      status: 'active',
      search: '',
    },
    evaluations: {
      status: 'all',
      year: new Date().getFullYear(),
      type: 'all',
      search: '',
    },
    departments: {
      status: 'active',
      search: '',
    },
  },
  
  // View preferences
  viewPreferences: {
    usersView: 'grid', // 'grid' | 'list'
    evaluationsView: 'list',
    departmentsView: 'grid',
    theme: 'light', // 'light' | 'dark'
    density: 'normal', // 'compact' | 'normal' | 'comfortable'
  },
  
  // Current page and pagination
  pagination: {
    users: { page: 1, limit: 10 },
    evaluations: { page: 1, limit: 10 },
    departments: { page: 1, limit: 10 },
  },
  
  // Error states
  error: null,
  
  // Breadcrumbs
  breadcrumbs: [],
  
  // Active tab/section
  activeTab: 'overview',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading actions
    setLoading: (state, action) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    
    // Sidebar actions
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    
    // Modal actions
    openModal: (state, action) => {
      const { modalName, data } = action.payload;
      state.modals[modalName] = true;
      state.modalData = data || null;
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      state.modals[modalName] = false;
      if (state.modalData) {
        state.modalData = null;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modal => {
        state.modals[modal] = false;
      });
      state.modalData = null;
    },
    setModalData: (state, action) => {
      state.modalData = action.payload;
    },
    
    // Notification actions
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notif => notif.id !== action.payload
      );
    },
    markNotificationRead: (state, action) => {
      const notification = state.notifications.find(
        notif => notif.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(notif => {
        notif.read = true;
      });
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Filter actions
    setFilter: (state, action) => {
      const { section, filterName, value } = action.payload;
      if (state.filters[section]) {
        state.filters[section][filterName] = value;
        
        // Reset pagination when filter changes
        if (state.pagination[section]) {
          state.pagination[section].page = 1;
        }
      }
    },
    resetFilters: (state, action) => {
      const section = action.payload;
      if (state.filters[section]) {
        // Reset to initial values
        Object.keys(state.filters[section]).forEach(key => {
          if (key === 'search') {
            state.filters[section][key] = '';
          } else if (key === 'year') {
            state.filters[section][key] = new Date().getFullYear();
          } else {
            state.filters[section][key] = 'all';
          }
        });
        
        // Reset pagination
        if (state.pagination[section]) {
          state.pagination[section].page = 1;
        }
      }
    },
    
    // View preference actions
    setViewPreference: (state, action) => {
      const { preference, value } = action.payload;
      state.viewPreferences[preference] = value;
      
      // Save to localStorage
      localStorage.setItem('viewPreferences', JSON.stringify(state.viewPreferences));
    },
    loadViewPreferences: (state) => {
      const saved = localStorage.getItem('viewPreferences');
      if (saved) {
        try {
          state.viewPreferences = { ...state.viewPreferences, ...JSON.parse(saved) };
        } catch (error) {
          console.error('Failed to load view preferences:', error);
        }
      }
    },
    
    // Pagination actions
    setPagination: (state, action) => {
      const { section, page, limit } = action.payload;
      if (state.pagination[section]) {
        if (page !== undefined) state.pagination[section].page = page;
        if (limit !== undefined) state.pagination[section].limit = limit;
      }
    },
    
    // Error actions
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    
    // Breadcrumb actions
    setBreadcrumbs: (state, action) => {
      state.breadcrumbs = action.payload;
    },
    addBreadcrumb: (state, action) => {
      state.breadcrumbs.push(action.payload);
    },
    
    // Tab actions
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    
    // Utility actions
    resetUIState: (state) => {
      return {
        ...initialState,
        viewPreferences: state.viewPreferences, // Preserve view preferences
      };
    },
  },
});

export const {
  setLoading,
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  closeAllModals,
  setModalData,
  addNotification,
  removeNotification,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  setFilter,
  resetFilters,
  setViewPreference,
  loadViewPreferences,
  setPagination,
  setError,
  clearError,
  setBreadcrumbs,
  addBreadcrumb,
  setActiveTab,
  resetUIState,
} = uiSlice.actions;

// Selectors
export const selectUILoading = (state) => state.ui.isLoading;
export const selectLoadingMessage = (state) => state.ui.loadingMessage;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectModals = (state) => state.ui.modals;
export const selectModalData = (state) => state.ui.modalData;
export const selectNotifications = (state) => state.ui.notifications;
export const selectUnreadNotifications = (state) => 
  state.ui.notifications.filter(notif => !notif.read);
export const selectFilters = (state) => state.ui.filters;
export const selectViewPreferences = (state) => state.ui.viewPreferences;
export const selectPagination = (state) => state.ui.pagination;
export const selectUIError = (state) => state.ui.error;
export const selectBreadcrumbs = (state) => state.ui.breadcrumbs;
export const selectActiveTab = (state) => state.ui.activeTab;

// Filter selectors for specific sections
export const selectUserFilters = (state) => state.ui.filters.users;
export const selectEvaluationFilters = (state) => state.ui.filters.evaluations;
export const selectDepartmentFilters = (state) => state.ui.filters.departments;

export default uiSlice.reducer;
