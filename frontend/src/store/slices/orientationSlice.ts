/**
 * Orientation Slice
 * Manages the state for client orientation form submissions
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// Define types for orientation data
export interface OrientationData {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  healthInfo: string;
  waiverInitials: string;
  trainingGoals: string | null;
  experienceLevel: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
}

export interface OrientationState {
  orientations: OrientationData[];
  selectedOrientation: OrientationData | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: OrientationState = {
  orientations: [],
  selectedOrientation: null,
  loading: false,
  error: null,
};

// Async thunks for API calls
export const fetchAllOrientations = createAsyncThunk(
  'orientation/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      // Extend the api service with the new endpoint
      const response = await api.get('/orientation/all');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch orientation data');
    }
  }
);

export const fetchOrientationByUserId = createAsyncThunk(
  'orientation/fetchByUserId',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orientation/user/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch orientation data');
    }
  }
);

// Create the slice
const orientationSlice = createSlice({
  name: 'orientation',
  initialState,
  reducers: {
    setSelectedOrientation: (state, action: PayloadAction<OrientationData | null>) => {
      state.selectedOrientation = action.payload;
    },
    clearOrientationData: (state) => {
      state.orientations = [];
      state.selectedOrientation = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchAllOrientations
      .addCase(fetchAllOrientations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllOrientations.fulfilled, (state, action) => {
        state.loading = false;
        state.orientations = action.payload;
      })
      .addCase(fetchAllOrientations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle fetchOrientationByUserId
      .addCase(fetchOrientationByUserId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrientationByUserId.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrientation = action.payload;
      })
      .addCase(fetchOrientationByUserId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedOrientation, clearOrientationData } = orientationSlice.actions;

export default orientationSlice.reducer;
