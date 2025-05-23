/**
 * Exercise Slice
 * ============
 * Redux slice for managing exercise data
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// Exercise type definition
export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  image?: string;
}

// State interface
interface ExerciseState {
  exercises: Exercise[];
  currentExercise: Exercise | null;
  loading: boolean;
  error: string | null;
  filters: {
    category: string | null;
    muscleGroup: string | null;
    equipment: string | null;
    difficulty: string | null;
    searchTerm: string;
  };
}

// Initial state
const initialState: ExerciseState = {
  exercises: [],
  currentExercise: null,
  loading: false,
  error: null,
  filters: {
    category: null,
    muscleGroup: null,
    equipment: null,
    difficulty: null,
    searchTerm: '',
  },
};

/**
 * Async thunk for fetching exercises
 */
export const fetchExercises = createAsyncThunk(
  'exercise/fetchExercises',
  async (filters?: any, { rejectWithValue }) => {
    try {
      const response = await api.exercise.getExercises(filters);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch exercises');
    }
  }
);

/**
 * Async thunk for fetching a single exercise by ID
 */
export const fetchExerciseById = createAsyncThunk(
  'exercise/fetchExerciseById',
  async (exerciseId: string, { rejectWithValue }) => {
    try {
      const response = await api.exercise.getExerciseById(exerciseId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch exercise');
    }
  }
);

// Create the exercise slice
const exerciseSlice = createSlice({
  name: 'exercise',
  initialState,
  reducers: {
    // Set exercise filters
    setFilter: (state, action: PayloadAction<{ key: string; value: string | null }>) => {
      const { key, value } = action.payload;
      if (key in state.filters) {
        (state.filters as any)[key] = value;
      }
    },
    
    // Clear all filters
    clearFilters: (state) => {
      state.filters = {
        category: null,
        muscleGroup: null,
        equipment: null,
        difficulty: null,
        searchTerm: '',
      };
    },
    
    // Set search term
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.filters.searchTerm = action.payload;
    },
    
    // Clear current exercise
    clearCurrentExercise: (state) => {
      state.currentExercise = null;
    },
    
    // Clear error message
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle fetchExercises actions
    builder
      .addCase(fetchExercises.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExercises.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.exercises) {
          state.exercises = action.payload.exercises;
        }
      })
      .addCase(fetchExercises.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle fetchExerciseById actions
      .addCase(fetchExerciseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExerciseById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.exercise) {
          state.currentExercise = action.payload.exercise;
        }
      })
      .addCase(fetchExerciseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { 
  setFilter, 
  clearFilters, 
  setSearchTerm, 
  clearCurrentExercise, 
  clearError 
} = exerciseSlice.actions;

// Export reducer
export default exerciseSlice.reducer;
