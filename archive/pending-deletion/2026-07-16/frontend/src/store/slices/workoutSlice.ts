/**
 * Workout Slice
 * ============
 * Redux slice for managing workout and progress data
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { clientProgressService } from '../../services/client-progress-service';
import workoutPlannerService from '../../services/workout-planner-service';
import workoutSessionService from '../../services/workout-session-service';
import {
  ClientProgressData,
  WorkoutStatistics,
} from '../../pages/workout/types/progress.types';
import { WorkoutPlan, FetchPlansParams, SavePlanParams } from '../../pages/workout/types/plan.types';
import { WorkoutSession, FetchSessionsParams, SaveSessionParams } from '../../pages/workout/types/session.types';

// State interface
interface WorkoutState {
  clientProgress: {
    data: ClientProgressData | null;
    loading: boolean;
    error: string | null;
  };
  statistics: {
    data: WorkoutStatistics | null;
    loading: boolean;
    error: string | null;
  };
  plans: {
    data: WorkoutPlan[];
    selectedPlan: WorkoutPlan | null;
    loading: boolean;
    error: string | null;
    savingPlan: boolean;
    saveError: string | null;
  };
  sessions: {
    data: WorkoutSession[];
    totalCount: number;
    selectedSession: WorkoutSession | null;
    loading: boolean;
    error: string | null;
    savingSession: boolean;
    saveError: string | null;
  };
  selectedClientId: string | null;
  timeRange: string;
}

// Initial state
const initialState: WorkoutState = {
  clientProgress: {
    data: null,
    loading: false,
    error: null,
  },
  statistics: {
    data: null,
    loading: false,
    error: null,
  },
  plans: {
    data: [],
    selectedPlan: null,
    loading: false,
    error: null,
    savingPlan: false,
    saveError: null,
  },
  sessions: {
    data: [],
    totalCount: 0,
    selectedSession: null,
    loading: false,
    error: null,
    savingSession: false,
    saveError: null,
  },
  selectedClientId: null,
  timeRange: '30days',
};


/**
 * Async thunk for fetching client progress
 */
export const fetchClientProgress = createAsyncThunk(
  'workout/fetchClientProgress',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await clientProgressService.getClientProgressById(userId);
      if (!response.success || !response.progress) {
        throw new Error(response.error || 'Failed to fetch client progress');
      }

      return { progress: response.progress };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch client progress');
    }
  }
);

/**
 * Async thunk for fetching workout statistics
 */
export const fetchWorkoutStatistics = createAsyncThunk(
  'workout/fetchWorkoutStatistics',
  async (
    {
      userId,
      timeRange
    }: {
      userId: string;
      timeRange: string
    },
    { rejectWithValue }
  ) => {
    try {
      const getDateRange = () => {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        let startDate = '';

        switch (timeRange) {
          case '7days': {
            const date = new Date(now);
            date.setDate(now.getDate() - 7);
            startDate = date.toISOString().split('T')[0];
            break;
          }
          case '30days': {
            const date = new Date(now);
            date.setDate(now.getDate() - 30);
            startDate = date.toISOString().split('T')[0];
            break;
          }
          case '90days': {
            const date = new Date(now);
            date.setDate(now.getDate() - 90);
            startDate = date.toISOString().split('T')[0];
            break;
          }
          case 'year': {
            const date = new Date(now);
            date.setFullYear(now.getFullYear() - 1);
            startDate = date.toISOString().split('T')[0];
            break;
          }
          case 'all':
          default:
            startDate = '';
        }

        return { startDate, endDate };
      };

      const { startDate, endDate } = getDateRange();
      const response = await workoutSessionService.getSessionStatistics(userId, {
        startDate,
        endDate,
        includeExerciseBreakdown: true,
        includeMuscleGroupBreakdown: true,
        includeWeekdayBreakdown: true,
        includeIntensityTrends: true
      });

      return response?.statistics ? response : { statistics: response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workout statistics');
    }
  }
);

/**
 * Async thunk for fetching workout plans
 */
export const fetchWorkoutPlans = createAsyncThunk(
  'workout/fetchWorkoutPlans',
  async (params: FetchPlansParams, { rejectWithValue }) => {
    try {
      return await workoutPlannerService.getWorkoutPlans(params);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workout plans');
    }
  }
);

/**
 * Async thunk for fetching a specific workout plan
 */
export const fetchWorkoutPlan = createAsyncThunk(
  'workout/fetchWorkoutPlan',
  async (planId: string, { rejectWithValue }) => {
    try {
      return await workoutPlannerService.getWorkoutPlan(planId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workout plan');
    }
  }
);

/**
 * Async thunk for saving a workout plan (create or update)
 */
export const saveWorkoutPlan = createAsyncThunk(
  'workout/saveWorkoutPlan',
  async (params: SavePlanParams, { rejectWithValue }) => {
    try {
      return params.planId
        ? await workoutPlannerService.updateWorkoutPlan(params.planId, params.plan)
        : await workoutPlannerService.createWorkoutPlan(params.plan as any);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save workout plan');
    }
  }
);

/**
 * Async thunk for deleting a workout plan
 */
export const deleteWorkoutPlan = createAsyncThunk(
  'workout/deleteWorkoutPlan',
  async (planId: string, { rejectWithValue }) => {
    try {
      const response = await workoutPlannerService.deleteWorkoutPlan(planId);
      return { ...response, planId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete workout plan');
    }
  }
);

/**
 * Async thunk for fetching workout sessions
 */
export const fetchWorkoutSessions = createAsyncThunk(
  'workout/fetchWorkoutSessions',
  async (params: FetchSessionsParams, { rejectWithValue }) => {
    try {
      return await workoutSessionService.getWorkoutSessions(params);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workout sessions');
    }
  }
);

/**
 * Async thunk for fetching a specific workout session
 */
export const fetchWorkoutSession = createAsyncThunk(
  'workout/fetchWorkoutSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      return await workoutSessionService.getWorkoutSession(sessionId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch workout session');
    }
  }
);

/**
 * Async thunk for saving a workout session (create or update)
 */
export const saveWorkoutSession = createAsyncThunk(
  'workout/saveWorkoutSession',
  async (params: SaveSessionParams, { rejectWithValue }) => {
    try {
      return params.sessionId
        ? await workoutSessionService.updateWorkoutSession(params.sessionId, params.session)
        : await workoutSessionService.createWorkoutSession(params.session as any);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save workout session');
    }
  }
);

/**
 * Async thunk for deleting a workout session
 */
export const deleteWorkoutSession = createAsyncThunk(
  'workout/deleteWorkoutSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await workoutSessionService.deleteWorkoutSession(sessionId);
      return { ...response, sessionId };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete workout session');
    }
  }
);
// Create the workout slice
const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    // Set the selected client
    setSelectedClient: (state, action: PayloadAction<string>) => {
      state.selectedClientId = action.payload;
    },

    // Set the time range for filtering
    setTimeRange: (state, action: PayloadAction<string>) => {
      state.timeRange = action.payload;
    },

    // Clear progress data (useful when switching users)
    clearProgressData: (state) => {
      state.clientProgress.data = null;
      state.statistics.data = null;
    },

    // Set selected plan
    setSelectedPlan: (state, action: PayloadAction<WorkoutPlan | null>) => {
      state.plans.selectedPlan = action.payload;
    },

    // Set selected session
    setSelectedSession: (state, action: PayloadAction<WorkoutSession | null>) => {
      state.sessions.selectedSession = action.payload;
    },

    // Clear specific errors
    clearPlanSaveError: (state) => {
      state.plans.saveError = null;
    },

    clearSessionSaveError: (state) => {
      state.sessions.saveError = null;
    }
  },
  extraReducers: (builder) => {
    // Handle client progress actions
    builder
      .addCase(fetchClientProgress.pending, (state) => {
        state.clientProgress.loading = true;
        state.clientProgress.error = null;
      })
      .addCase(fetchClientProgress.fulfilled, (state, action) => {
        state.clientProgress.loading = false;
        if (action.payload && action.payload.progress) {
          state.clientProgress.data = action.payload.progress;
        }
      })
      .addCase(fetchClientProgress.rejected, (state, action) => {
        state.clientProgress.loading = false;
        state.clientProgress.error = action.payload as string;
      })

      // Handle workout statistics actions
      .addCase(fetchWorkoutStatistics.pending, (state) => {
        state.statistics.loading = true;
        state.statistics.error = null;
      })
      .addCase(fetchWorkoutStatistics.fulfilled, (state, action) => {
        state.statistics.loading = false;
        if (action.payload && action.payload.statistics) {
          state.statistics.data = action.payload.statistics;
        }
      })
      .addCase(fetchWorkoutStatistics.rejected, (state, action) => {
        state.statistics.loading = false;
        state.statistics.error = action.payload as string;
      })

      // Handle fetch workout plans actions
      .addCase(fetchWorkoutPlans.pending, (state) => {
        state.plans.loading = true;
        state.plans.error = null;
      })
      .addCase(fetchWorkoutPlans.fulfilled, (state, action) => {
        state.plans.loading = false;
        if (action.payload && action.payload.plans) {
          state.plans.data = action.payload.plans;
        }
      })
      .addCase(fetchWorkoutPlans.rejected, (state, action) => {
        state.plans.loading = false;
        state.plans.error = action.payload as string;
      })

      // Handle fetch single workout plan actions
      .addCase(fetchWorkoutPlan.pending, (state) => {
        state.plans.loading = true;
        state.plans.error = null;
      })
      .addCase(fetchWorkoutPlan.fulfilled, (state, action) => {
        state.plans.loading = false;
        if (action.payload && action.payload.plan) {
          state.plans.selectedPlan = action.payload.plan;

          // Update in the plans array if it exists there
          const index = state.plans.data.findIndex(p => p.id === action.payload.plan.id);
          if (index !== -1) {
            state.plans.data[index] = action.payload.plan;
          } else {
            state.plans.data.push(action.payload.plan);
          }
        }
      })
      .addCase(fetchWorkoutPlan.rejected, (state, action) => {
        state.plans.loading = false;
        state.plans.error = action.payload as string;
      })

      // Handle save workout plan actions
      .addCase(saveWorkoutPlan.pending, (state) => {
        state.plans.savingPlan = true;
        state.plans.saveError = null;
      })
      .addCase(saveWorkoutPlan.fulfilled, (state, action) => {
        state.plans.savingPlan = false;
        if (action.payload && action.payload.plan) {
          const newPlan = action.payload.plan;

          // Update existing or add new plan
          const index = state.plans.data.findIndex(p => p.id === newPlan.id);
          if (index !== -1) {
            state.plans.data[index] = newPlan;
          } else {
            state.plans.data.push(newPlan);
          }

          // Set as selected plan
          state.plans.selectedPlan = newPlan;
        }
      })
      .addCase(saveWorkoutPlan.rejected, (state, action) => {
        state.plans.savingPlan = false;
        state.plans.saveError = action.payload as string;
      })

      // Handle delete workout plan actions
      .addCase(deleteWorkoutPlan.pending, (state) => {
        state.plans.loading = true;
        state.plans.error = null;
      })
      .addCase(deleteWorkoutPlan.fulfilled, (state, action) => {
        state.plans.loading = false;
        if (action.payload && action.payload.planId) {
          // Remove from plans array
          state.plans.data = state.plans.data.filter(p => p.id !== action.payload.planId);

          // Clear selected plan if it was deleted
          if (state.plans.selectedPlan && state.plans.selectedPlan.id === action.payload.planId) {
            state.plans.selectedPlan = null;
          }
        }
      })
      .addCase(deleteWorkoutPlan.rejected, (state, action) => {
        state.plans.loading = false;
        state.plans.error = action.payload as string;
      })

      // Handle fetch workout sessions actions
      .addCase(fetchWorkoutSessions.pending, (state) => {
        state.sessions.loading = true;
        state.sessions.error = null;
      })
      .addCase(fetchWorkoutSessions.fulfilled, (state, action) => {
        state.sessions.loading = false;
        if (action.payload) {
          state.sessions.data = action.payload.sessions || [];
          state.sessions.totalCount = action.payload.totalCount || state.sessions.data.length;
        }
      })
      .addCase(fetchWorkoutSessions.rejected, (state, action) => {
        state.sessions.loading = false;
        state.sessions.error = action.payload as string;
      })

      // Handle fetch single workout session actions
      .addCase(fetchWorkoutSession.pending, (state) => {
        state.sessions.loading = true;
        state.sessions.error = null;
      })
      .addCase(fetchWorkoutSession.fulfilled, (state, action) => {
        state.sessions.loading = false;
        if (action.payload && action.payload.session) {
          state.sessions.selectedSession = action.payload.session;

          // Update in the sessions array if it exists there
          const index = state.sessions.data.findIndex(s => s.id === action.payload.session.id);
          if (index !== -1) {
            state.sessions.data[index] = action.payload.session;
          } else {
            state.sessions.data.push(action.payload.session);
          }
        }
      })
      .addCase(fetchWorkoutSession.rejected, (state, action) => {
        state.sessions.loading = false;
        state.sessions.error = action.payload as string;
      })

      // Handle save workout session actions
      .addCase(saveWorkoutSession.pending, (state) => {
        state.sessions.savingSession = true;
        state.sessions.saveError = null;
      })
      .addCase(saveWorkoutSession.fulfilled, (state, action) => {
        state.sessions.savingSession = false;
        if (action.payload && action.payload.session) {
          const newSession = action.payload.session;

          // Update existing or add new session
          const index = state.sessions.data.findIndex(s => s.id === newSession.id);
          if (index !== -1) {
            state.sessions.data[index] = newSession;
          } else {
            state.sessions.data.push(newSession);
          }

          // Set as selected session
          state.sessions.selectedSession = newSession;
        }
      })
      .addCase(saveWorkoutSession.rejected, (state, action) => {
        state.sessions.savingSession = false;
        state.sessions.saveError = action.payload as string;
      })

      // Handle delete workout session actions
      .addCase(deleteWorkoutSession.pending, (state) => {
        state.sessions.loading = true;
        state.sessions.error = null;
      })
      .addCase(deleteWorkoutSession.fulfilled, (state, action) => {
        state.sessions.loading = false;
        if (action.payload && action.payload.sessionId) {
          // Remove from sessions array
          state.sessions.data = state.sessions.data.filter(
            s => s.id !== action.payload.sessionId
          );

          // Clear selected session if it was deleted
          if (
            state.sessions.selectedSession &&
            state.sessions.selectedSession.id === action.payload.sessionId
          ) {
            state.sessions.selectedSession = null;
          }
        }
      })
      .addCase(deleteWorkoutSession.rejected, (state, action) => {
        state.sessions.loading = false;
        state.sessions.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setSelectedClient,
  setTimeRange,
  clearProgressData,
  setSelectedPlan,
  setSelectedSession,
  clearPlanSaveError,
  clearSessionSaveError} = workoutSlice.actions;

// Export reducer
export default workoutSlice.reducer;
