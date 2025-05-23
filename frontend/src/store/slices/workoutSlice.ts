/**
 * Workout Slice
 * ============
 * Redux slice for managing workout and progress data
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { 
  ClientProgressData, 
  WorkoutStatistics,
} from '../../pages/workout/types/progress.types';
import {
  WorkoutPlan,
  WorkoutPlanResponse,
  FetchPlansParams,
  SavePlanParams
} from '../../pages/workout/types/plan.types';
import {
  WorkoutSession,
  WorkoutSessionResponse,
  FetchSessionsParams,
  SaveSessionParams
} from '../../pages/workout/types/session.types';

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

// Default mock data for development
const mockProgress: ClientProgressData = {
  userId: 'mock-user-id',
  strengthLevel: 5,
  cardioLevel: 3,
  flexibilityLevel: 4,
  balanceLevel: 2,
  coreLevel: 6,
  totalWorkouts: 25,
  totalSets: 450,
  totalReps: 3600,
  totalWeight: 12000,
  totalExercises: 300,
  lastWorkoutDate: new Date().toISOString(),
  currentStreak: 3
};

const mockStatistics: WorkoutStatistics = {
  totalWorkouts: 25,
  totalDuration: 1500, // 25 hours in minutes
  totalExercises: 300,
  totalSets: 450,
  totalReps: 3600,
  totalWeight: 12000,
  averageIntensity: 7.5,
  weekdayBreakdown: [2, 5, 4, 5, 3, 4, 2],
  exerciseBreakdown: [
    { id: '1', name: 'Squats', count: 20, sets: 60, reps: 480, totalWeight: 3000, category: 'strength' },
    { id: '2', name: 'Bench Press', count: 18, sets: 54, reps: 432, totalWeight: 2800, category: 'strength' },
    { id: '3', name: 'Deadlift', count: 15, sets: 45, reps: 360, totalWeight: 3500, category: 'strength' },
    { id: '4', name: 'Pull Ups', count: 12, sets: 36, reps: 288, totalWeight: 900, category: 'strength' },
    { id: '5', name: 'Running', count: 10, sets: 10, reps: 10, totalWeight: 0, category: 'cardio' }
  ],
  muscleGroupBreakdown: [
    { id: '1', name: 'Quadriceps', shortName: 'Quads', count: 30, bodyRegion: 'lower_body' },
    { id: '2', name: 'Chest', shortName: 'Chest', count: 25, bodyRegion: 'upper_body' },
    { id: '3', name: 'Back', shortName: 'Back', count: 22, bodyRegion: 'upper_body' },
    { id: '4', name: 'Hamstrings', shortName: 'Hams', count: 18, bodyRegion: 'lower_body' },
    { id: '5', name: 'Shoulders', shortName: 'Delts', count: 15, bodyRegion: 'upper_body' },
    { id: '6', name: 'Core', shortName: 'Core', count: 12, bodyRegion: 'core' }
  ],
  intensityTrends: [
    { week: 'W1', averageIntensity: 5.5 },
    { week: 'W2', averageIntensity: 6.2 },
    { week: 'W3', averageIntensity: 6.8 },
    { week: 'W4', averageIntensity: 7.5 }
  ]
};

// Mock workout plans for development
const mockWorkoutPlans: WorkoutPlan[] = [
  {
    id: 'plan-1',
    userId: 'mock-user-id',
    title: '4-Week Strength Builder',
    description: 'A progressive program focusing on the main compound lifts',
    durationWeeks: 4,
    createdAt: '2025-04-15T10:30:00Z',
    updatedAt: '2025-04-15T10:30:00Z',
    status: 'active',
    tags: ['strength', 'beginner'],
    days: [
      {
        dayNumber: 1,
        title: 'Day 1 - Lower Body',
        exercises: [
          {
            id: 'e1',
            name: 'Barbell Squat',
            sets: 4,
            reps: '8-10',
            rest: 120,
            notes: 'Focus on form and depth'
          },
          {
            id: 'e2',
            name: 'Romanian Deadlift',
            sets: 3,
            reps: '10-12',
            rest: 90,
            notes: 'Keep back straight'
          }
        ]
      },
      {
        dayNumber: 2,
        title: 'Day 2 - Upper Body',
        exercises: [
          {
            id: 'e3',
            name: 'Bench Press',
            sets: 4,
            reps: '8-10',
            rest: 120,
            notes: 'Control the weight'
          },
          {
            id: 'e4',
            name: 'Barbell Row',
            sets: 3,
            reps: '10-12',
            rest: 90,
            notes: 'Squeeze shoulder blades'
          }
        ]
      }
    ]
  },
  {
    id: 'plan-2',
    userId: 'mock-user-id',
    title: 'HIIT Cardio Program',
    description: 'High-intensity interval training for fat loss',
    durationWeeks: 6,
    createdAt: '2025-04-01T14:15:00Z',
    updatedAt: '2025-04-05T09:45:00Z',
    status: 'active',
    tags: ['cardio', 'fat-loss'],
    days: [
      {
        dayNumber: 1,
        title: 'Sprint Intervals',
        exercises: [
          {
            id: 'e5',
            name: 'Treadmill Sprints',
            sets: 10,
            reps: '30 sec sprint, 90 sec rest',
            rest: 90,
            notes: 'Maximum effort on sprints'
          }
        ]
      },
      {
        dayNumber: 2,
        title: 'Circuit Training',
        exercises: [
          {
            id: 'e6',
            name: 'Burpees',
            sets: 3,
            reps: '12',
            rest: 30,
            notes: 'Full range of motion'
          },
          {
            id: 'e7',
            name: 'Mountain Climbers',
            sets: 3,
            reps: '45 seconds',
            rest: 30,
            notes: 'Keep core tight'
          },
          {
            id: 'e8',
            name: 'Kettlebell Swings',
            sets: 3,
            reps: '15',
            rest: 30,
            notes: 'Hip hinge movement'
          }
        ]
      }
    ]
  }
];

// Mock sessions for development
const mockSessions: WorkoutSession[] = [
  {
    id: 's1',
    userId: 'mock-user-id',
    title: 'Full Body Strength',
    date: '2025-05-01T15:30:00Z',
    duration: 65, // in minutes
    intensity: 8,
    exercises: [
      {
        id: 'e1',
        name: 'Barbell Squat',
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
        sets: [
          { setNumber: 1, weight: 135, reps: 10, notes: 'Warm-up set' },
          { setNumber: 2, weight: 185, reps: 8, notes: '' },
          { setNumber: 3, weight: 225, reps: 6, notes: 'PR attempt' },
          { setNumber: 4, weight: 205, reps: 6, notes: '' }
        ]
      },
      {
        id: 'e2',
        name: 'Bench Press',
        muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
        sets: [
          { setNumber: 1, weight: 95, reps: 12, notes: 'Warm-up set' },
          { setNumber: 2, weight: 135, reps: 10, notes: '' },
          { setNumber: 3, weight: 155, reps: 8, notes: '' },
          { setNumber: 4, weight: 175, reps: 6, notes: 'Form felt good' }
        ]
      },
      {
        id: 'e3',
        name: 'Bent Over Row',
        muscleGroups: ['Back', 'Biceps'],
        sets: [
          { setNumber: 1, weight: 95, reps: 12, notes: '' },
          { setNumber: 2, weight: 115, reps: 10, notes: '' },
          { setNumber: 3, weight: 135, reps: 8, notes: '' }
        ]
      }
    ],
    notes: 'Felt strong today. Increased squat weight by 20lbs from last session.',
    totalWeight: 2380,
    totalReps: 84,
    totalSets: 11
  },
  {
    id: 's2',
    userId: 'mock-user-id',
    title: 'HIIT Cardio + Core',
    date: '2025-04-29T17:00:00Z',
    duration: 45,
    intensity: 9,
    exercises: [
      {
        id: 'e4',
        name: 'Treadmill Sprint Intervals',
        muscleGroups: ['Cardiovascular', 'Legs'],
        sets: [
          { setNumber: 1, weight: 0, reps: 8, notes: '30 sec sprint, 90 sec rest x8' }
        ]
      },
      {
        id: 'e5',
        name: 'Plank',
        muscleGroups: ['Core', 'Shoulders'],
        sets: [
          { setNumber: 1, weight: 0, reps: 3, notes: '1 minute hold x3' }
        ]
      },
      {
        id: 'e6',
        name: 'Russian Twists',
        muscleGroups: ['Core', 'Obliques'],
        sets: [
          { setNumber: 1, weight: 20, reps: 20, notes: '' },
          { setNumber: 2, weight: 20, reps: 20, notes: '' },
          { setNumber: 3, weight: 20, reps: 20, notes: '' }
        ]
      }
    ],
    notes: 'Tough cardio session. Kept heart rate above 160bpm during intervals.',
    totalWeight: 60,
    totalReps: 69,
    totalSets: 5
  }
];

/**
 * Async thunk for fetching client progress
 */
export const fetchClientProgress = createAsyncThunk(
  'workout/fetchClientProgress',
  async (userId: string, { rejectWithValue }) => {
    try {
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        return { progress: mockProgress };
      }
      
      // Make the API request
      const response = await api.workout.getClientProgress(userId);
      return response;
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
      // Calculate date range based on selected time filter
      const getDateRange = () => {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        let startDate = '';
        
        switch (timeRange) {
          case '7days':
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            startDate = sevenDaysAgo.toISOString().split('T')[0];
            break;
          case '30days':
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            startDate = thirtyDaysAgo.toISOString().split('T')[0];
            break;
          case '90days':
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(now.getDate() - 90);
            startDate = ninetyDaysAgo.toISOString().split('T')[0];
            break;
          case 'year':
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(now.getFullYear() - 1);
            startDate = oneYearAgo.toISOString().split('T')[0];
            break;
          case 'all':
          default:
            // No start date constraint for 'all'
            startDate = '';
        }
        
        return { startDate, endDate };
      };
      
      const { startDate, endDate } = getDateRange();
      
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 700));
        return { statistics: mockStatistics };
      }
      
      // Make the API request
      const response = await api.workout.getWorkoutStatistics(userId, {
        startDate,
        endDate,
        includeExerciseBreakdown: true,
        includeMuscleGroupBreakdown: true,
        includeWeekdayBreakdown: true,
        includeIntensityTrends: true
      });
      
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 600));
        return { plans: mockWorkoutPlans, totalCount: mockWorkoutPlans.length };
      }
      
      // Make the API request
      const response = await api.workout.getWorkoutPlans(params);
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        const plan = mockWorkoutPlans.find(p => p.id === planId);
        if (!plan) {
          return rejectWithValue('Workout plan not found');
        }
        return { plan };
      }
      
      // Make the API request
      const response = await api.workout.getWorkoutPlan(planId);
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate creating or updating a plan
        const newPlan: WorkoutPlan = {
          ...params.plan,
          id: params.planId || `plan-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return { plan: newPlan };
      }
      
      // Make the API request (create or update)
      let response;
      if (params.planId) {
        response = await api.workout.updateWorkoutPlan(params.planId, params.plan);
      } else {
        response = await api.workout.createWorkoutPlan(params.plan);
      }
      
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, planId };
      }
      
      // Make the API request
      const response = await api.workout.deleteWorkoutPlan(planId);
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Apply search filter if provided
        let filteredSessions = [...mockSessions];
        if (params.searchTerm) {
          const search = params.searchTerm.toLowerCase();
          filteredSessions = filteredSessions.filter(session => 
            session.title.toLowerCase().includes(search) ||
            session.notes.toLowerCase().includes(search) ||
            session.exercises.some(ex => 
              ex.name.toLowerCase().includes(search) ||
              ex.muscleGroups.some(mg => mg.toLowerCase().includes(search))
            )
          );
        }
        
        // Apply date filters if provided
        if (params.startDate || params.endDate) {
          filteredSessions = filteredSessions.filter(session => {
            const sessionDate = new Date(session.date);
            let matchesStart = true;
            let matchesEnd = true;
            
            if (params.startDate) {
              const startDate = new Date(params.startDate);
              matchesStart = sessionDate >= startDate;
            }
            
            if (params.endDate) {
              const endDate = new Date(params.endDate);
              matchesEnd = sessionDate <= endDate;
            }
            
            return matchesStart && matchesEnd;
          });
        }
        
        return { 
          sessions: filteredSessions,
          totalCount: filteredSessions.length
        };
      }
      
      // Make the API request
      const response = await api.workout.getWorkoutSessions(params);
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        const session = mockSessions.find(s => s.id === sessionId);
        if (!session) {
          return rejectWithValue('Workout session not found');
        }
        return { session };
      }
      
      // Make the API request
      const response = await api.workout.getWorkoutSession(sessionId);
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate creating or updating a session
        const newSession: WorkoutSession = {
          ...params.session,
          id: params.sessionId || `session-${Date.now()}`
        };
        
        return { session: newSession };
      }
      
      // Make the API request (create or update)
      let response;
      if (params.sessionId) {
        response = await api.workout.updateWorkoutSession(params.sessionId, params.session);
      } else {
        response = await api.workout.createWorkoutSession(params.session);
      }
      
      return response;
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
      // Check if mock mode is enabled
      if (api.isMockModeEnabled()) {
        // Add a slight delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, sessionId };
      }
      
      // Make the API request
      const response = await api.workout.deleteWorkoutSession(sessionId);
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
    },
    
    // Enable mock mode for development/testing
    enableMockMode: (state, action: PayloadAction<boolean>) => {
      api.enableMockMode(action.payload);
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
  clearSessionSaveError,
  enableMockMode 
} = workoutSlice.actions;

// Export reducer
export default workoutSlice.reducer;
