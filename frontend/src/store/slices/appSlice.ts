/**
 * App Slice for SwanStudios
 * Manages global application state and initialization
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppState {
  isInitialized: boolean;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    [key: string]: boolean;
  };
}

const initialState: AppState = {
  isInitialized: false,
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  features: {
    // Feature flags
    enableNewDashboard: process.env.REACT_APP_ENABLE_NEW_DASHBOARD === 'true',
    enableAdvancedAnalytics: process.env.REACT_APP_ENABLE_ADVANCED_ANALYTICS === 'true',
    enableMockMode: process.env.NODE_ENV === 'development'
  }
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setFeatureFlag: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      const { key, value } = action.payload;
      state.features[key] = value;
    },
    setEnvironment: (state, action: PayloadAction<'development' | 'staging' | 'production'>) => {
      state.environment = action.payload;
    }
  }
});

export const { 
  setInitialized, 
  setFeatureFlag, 
  setEnvironment 
} = appSlice.actions;

export default appSlice.reducer;