import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  isDarkMode: false,
};

// Load theme preference from localStorage
const loadThemeFromStorage = () => {
  try {
    const savedTheme = localStorage.getItem('mirrorup-theme');
    return savedTheme === 'dark';
  } catch (error) {
    return false; // Default to light mode if localStorage is not available
  }
};

// Save theme preference to localStorage
const saveThemeToStorage = (isDarkMode) => {
  try {
    localStorage.setItem('mirrorup-theme', isDarkMode ? 'dark' : 'light');
  } catch (error) {
    console.warn('Could not save theme preference to localStorage:', error);
  }
};

// Apply theme to document
const applyTheme = (isDarkMode) => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Initialize theme on app load
const initializeTheme = () => {
  const isDarkMode = loadThemeFromStorage();
  applyTheme(isDarkMode);
  return isDarkMode;
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    ...initialState,
    isDarkMode: initializeTheme(),
  },
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      saveThemeToStorage(state.isDarkMode);
      applyTheme(state.isDarkMode);
    },
    setTheme: (state, action) => {
      state.isDarkMode = action.payload;
      saveThemeToStorage(state.isDarkMode);
      applyTheme(state.isDarkMode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;

// Selectors
export const selectIsDarkMode = (state) => state.theme.isDarkMode;

export default themeSlice.reducer;
