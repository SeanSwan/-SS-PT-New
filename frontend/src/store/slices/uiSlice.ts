/**
 * UI Slice for SwanStudios
 * Manages UI state across the application
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  isLoading: boolean;
  isDarkMode: boolean;
  modalState: {
    [key: string]: boolean;
  };
  sidebarOpen: boolean;
}

const initialState: UIState = {
  isLoading: false,
  isDarkMode: localStorage.getItem('darkMode') === 'true',
  modalState: {},
  sidebarOpen: false
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem('darkMode', state.isDarkMode.toString());
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      localStorage.setItem('darkMode', state.isDarkMode.toString());
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modalState[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modalState[action.payload] = false;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    }
  }
});

export const { 
  setLoading, 
  toggleDarkMode, 
  setDarkMode, 
  openModal, 
  closeModal,
  toggleSidebar,
  setSidebarOpen
} = uiSlice.actions;

export default uiSlice.reducer;