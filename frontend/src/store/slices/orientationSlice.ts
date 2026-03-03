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
  userId: number | null;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  source?: string;
  isLinked?: boolean;
  createdAt: string;
  updatedAt: string;
  matchedUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  user?: {
    id: number;
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
      const response = await api.get('/orientation/all');
      return response.data?.data || [];
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
      return response.data?.data || null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch orientation data');
    }
  }
);

export const linkOrientationToUser = createAsyncThunk(
  'orientation/linkToUser',
  async (
    { orientationId, userId }: { orientationId: number; userId?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/orientation/${orientationId}/link-user`, { userId });
      return response.data?.data || null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to link orientation to user');
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
      })
      .addCase(linkOrientationToUser.pending, (state) => {
        state.error = null;
      })
      .addCase(linkOrientationToUser.fulfilled, (state, action) => {
        const payload = action.payload as { orientation?: OrientationData; linkedUser?: OrientationData['user'] } | null;
        const updatedOrientation = payload?.orientation;

        if (!updatedOrientation) return;

        const index = state.orientations.findIndex((item) => item.id === updatedOrientation.id);
        if (index >= 0) {
          state.orientations[index] = {
            ...state.orientations[index],
            ...updatedOrientation,
            user: payload?.linkedUser || state.orientations[index].user || null,
            matchedUser: payload?.linkedUser || null,
            isLinked: true,
          };
        }

        if (state.selectedOrientation?.id === updatedOrientation.id) {
          state.selectedOrientation = {
            ...state.selectedOrientation,
            ...updatedOrientation,
            user: payload?.linkedUser || state.selectedOrientation.user || null,
            matchedUser: payload?.linkedUser || null,
            isLinked: true,
          };
        }
      })
      .addCase(linkOrientationToUser.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedOrientation, clearOrientationData } = orientationSlice.actions;

export default orientationSlice.reducer;
