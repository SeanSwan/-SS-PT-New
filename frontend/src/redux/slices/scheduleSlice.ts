/**
 * Schedule Slice for Redux State Management
 * 
 * This slice centralizes all schedule-related functionality:
 * - Fetches sessions from the API
 * - Manages session booking, creation, and updates
 * - Tracks session status and statistics
 * - Provides selectors for easy data access
 * 
 * Used by all dashboard components (client, trainer, admin)
 * for consistent data and UI interaction.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import enhancedScheduleService from '../../services/enhanced-schedule-service-safe';
import { RootState } from '../store';

// Define types
export interface SessionEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  status: 'available' | 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'blocked';
  userId?: string;
  trainerId?: string;
  location?: string;
  notes?: string;
  reason?: string;
  duration: number;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface TrainerOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ScheduleStats {
  total: number;
  available: number;
  booked: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  blocked: number; // Added for blocked time slots
  upcoming: number;
}

interface ScheduleState {
  sessions: SessionEvent[];
  trainers: TrainerOption[];
  clients: ClientOption[];
  stats: ScheduleStats;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  fetched: boolean;
}

// Initial state
const initialState: ScheduleState = {
  sessions: [],
  trainers: [],
  clients: [],
  stats: {
    total: 0,
    available: 0,
    booked: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    blocked: 0,
    upcoming: 0
  },
  status: 'idle',
  error: null,
  fetched: false
};

// Async thunks
export const fetchSessions = createAsyncThunk(
  'schedule/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const sessions = await enhancedScheduleService.getSessions();
      
      // Calculate stats
      const stats = {
        total: sessions.length,
        available: sessions.filter(s => s.status === 'available').length,
        booked: sessions.filter(s => s.status === 'booked').length,
        confirmed: sessions.filter(s => s.status === 'confirmed').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        blocked: sessions.filter(s => s.status === 'blocked').length,
        upcoming: sessions.filter(s => 
          ['available', 'booked', 'confirmed'].includes(s.status) && 
          new Date(s.start) > new Date()
        ).length
      };
      
      return { sessions, stats };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const fetchTrainers = createAsyncThunk(
  'schedule/fetchTrainers',
  async (_, { rejectWithValue }) => {
    try {
      const trainers = await enhancedScheduleService.getTrainers();
      return trainers;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const fetchClients = createAsyncThunk(
  'schedule/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const clients = await enhancedScheduleService.getClients();
      return clients;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const bookSession = createAsyncThunk(
  'schedule/bookSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.bookSession(sessionId);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const createSession = createAsyncThunk(
  'schedule/createSession',
  async (sessionData: any, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.createAvailableSessions({ 
        sessions: [sessionData] 
      });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const createBlockedTime = createAsyncThunk(
  'schedule/createBlockedTime',
  async (blockedTimeData: any, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.createBlockedTime(blockedTimeData);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const deleteBlockedTime = createAsyncThunk(
  'schedule/deleteBlockedTime',
  async ({ sessionId, removeAll = false }: { sessionId: string, removeAll?: boolean }, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.deleteBlockedTime(sessionId, removeAll);
      return { ...result, sessionId, removeAll };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const confirmSession = createAsyncThunk(
  'schedule/confirmSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.confirmSession(sessionId);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const cancelSession = createAsyncThunk(
  'schedule/cancelSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.cancelSession(sessionId);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const assignTrainer = createAsyncThunk(
  'schedule/assignTrainer',
  async ({ sessionId, trainerId }: { sessionId: string, trainerId: string }, { rejectWithValue }) => {
    try {
      const result = await enhancedScheduleService.assignTrainer(sessionId, trainerId);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

// Create the slice
const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    resetScheduleStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    },
    // Fallback for direct state initialization in case of errors
    setInitialState: (state, action) => {
      return { ...state, ...action.payload };
    },
    updateSession: (state, action: PayloadAction<SessionEvent>) => {
      const index = state.sessions.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.sessions[index] = action.payload;
        
        // Update stats
        state.stats = {
          total: state.sessions.length,
          available: state.sessions.filter(s => s.status === 'available').length,
          booked: state.sessions.filter(s => s.status === 'booked').length,
          confirmed: state.sessions.filter(s => s.status === 'confirmed').length,
          completed: state.sessions.filter(s => s.status === 'completed').length,
          cancelled: state.sessions.filter(s => s.status === 'cancelled').length,
          blocked: state.sessions.filter(s => s.status === 'blocked').length,
          upcoming: state.sessions.filter(s => 
            ['available', 'booked', 'confirmed'].includes(s.status) && 
            new Date(s.start) > new Date()
          ).length
        };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch sessions
      .addCase(fetchSessions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = action.payload.sessions;
        state.stats = action.payload.stats;
        state.fetched = true;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Fetch trainers
      .addCase(fetchTrainers.fulfilled, (state, action) => {
        state.trainers = action.payload;
      })
      
      // Fetch clients
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
      })
      
      // Book session
      .addCase(bookSession.fulfilled, (state, action) => {
        const { sessionId } = action.payload;
        const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex].status = 'booked';
          
          // Update stats
          state.stats.available--;
          state.stats.booked++;
        }
      })
      
      // Create session
      .addCase(createSession.fulfilled, (state, action) => {
        // Add new session to the list
        if (action.payload.sessions && action.payload.sessions.length > 0) {
          state.sessions = [...state.sessions, ...action.payload.sessions];
          
          // Update stats
          state.stats.total += action.payload.sessions.length;
          state.stats.available += action.payload.sessions.length;
          state.stats.upcoming += action.payload.sessions.length;
        }
      })
      
      // Create blocked time
      .addCase(createBlockedTime.fulfilled, (state, action) => {
        // Add the new blocked time to the list
        if (action.payload.session) {
          state.sessions.push(action.payload.session);
          
          // Update stats
          state.stats.total++;
          state.stats.blocked++;
        }
      })
      
      // Confirm session
      .addCase(confirmSession.fulfilled, (state, action) => {
        const { sessionId } = action.payload;
        const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex].status = 'confirmed';
          
          // Update stats
          state.stats.booked--;
          state.stats.confirmed++;
        }
      })
      
      // Cancel session
      .addCase(cancelSession.fulfilled, (state, action) => {
        const { sessionId } = action.payload;
        const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
          const oldStatus = state.sessions[sessionIndex].status;
          state.sessions[sessionIndex].status = 'cancelled';
          
          // Update stats
          state.stats[oldStatus as keyof typeof state.stats]--;
          state.stats.cancelled++;
          if (oldStatus !== 'completed' && oldStatus !== 'blocked') {
            state.stats.upcoming--;
          }
        }
      })
      
      // Assign trainer
      .addCase(assignTrainer.fulfilled, (state, action) => {
        const { sessionId, trainerId } = action.payload;
        const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex].trainerId = trainerId;
          
          // Find trainer details
          const trainer = state.trainers.find(t => t.id === trainerId);
          if (trainer) {
            state.sessions[sessionIndex].trainer = {
              id: trainer.id,
              firstName: trainer.firstName,
              lastName: trainer.lastName
            };
          }
        }
      })
      
      // Delete blocked time
      .addCase(deleteBlockedTime.fulfilled, (state, action) => {
        const { sessionId, removeAll } = action.payload;
        
        if (removeAll) {
          // Find the blocked time to check if it's a parent or child
          const blockedTime = state.sessions.find(s => s.id === sessionId && s.status === 'blocked');
          
          if (blockedTime) {
            if (blockedTime.isRecurring) {
              // This is a parent - remove parent and all children with this parentId
              state.sessions = state.sessions.filter(session => {
                return session.id !== sessionId && session.parentBlockedTimeId !== sessionId;
              });
            } else if (blockedTime.parentBlockedTimeId) {
              // This is a child - remove parent and all siblings
              const parentId = blockedTime.parentBlockedTimeId;
              state.sessions = state.sessions.filter(session => {
                return session.id !== parentId && session.parentBlockedTimeId !== parentId;
              });
            }
          }
        } else {
          // Just remove the specific blocked time
          state.sessions = state.sessions.filter(s => s.id !== sessionId);
        }
        
        // Update stats
        state.stats = {
          total: state.sessions.length,
          available: state.sessions.filter(s => s.status === 'available').length,
          booked: state.sessions.filter(s => s.status === 'booked').length,
          confirmed: state.sessions.filter(s => s.status === 'confirmed').length,
          completed: state.sessions.filter(s => s.status === 'completed').length,
          cancelled: state.sessions.filter(s => s.status === 'cancelled').length,
          blocked: state.sessions.filter(s => s.status === 'blocked').length,
          upcoming: state.sessions.filter(s => 
            ['available', 'booked', 'confirmed'].includes(s.status) && 
            new Date(s.start) > new Date()
          ).length
        };
      });
  }
});

// Export actions and reducer
export const { resetScheduleStatus, updateSession, setInitialState } = scheduleSlice.actions;
export default scheduleSlice.reducer;

// Selectors with null/undefined safety
export const selectAllSessions = (state: RootState) => state?.schedule?.sessions || [];
export const selectScheduleStatus = (state: RootState) => state?.schedule?.status || 'idle';
export const selectScheduleError = (state: RootState) => state?.schedule?.error || null;
export const selectScheduleStats = (state: RootState) => state?.schedule?.stats || {
  total: 0,
  available: 0,
  booked: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  blocked: 0,
  upcoming: 0
};
export const selectTrainers = (state: RootState) => state?.schedule?.trainers || [];
export const selectClients = (state: RootState) => state?.schedule?.clients || [];
export const selectSessionById = (state: RootState, sessionId: string) => 
  state?.schedule?.sessions?.find(session => session?.id === sessionId) || null;
export const selectSessionsByStatus = (state: RootState, status: string) => 
  state?.schedule?.sessions?.filter(session => session?.status === status) || [];
export const selectUpcomingSessions = (state: RootState) => 
  state?.schedule?.sessions?.filter(session => 
    ['available', 'booked', 'confirmed'].includes(session?.status || '') && 
    new Date(session?.start || 0) > new Date()
  ) || [];
export const selectClientSessions = (state: RootState, clientId: string) =>
  state?.schedule?.sessions?.filter(session => session?.userId === clientId) || [];
export const selectTrainerSessions = (state: RootState, trainerId: string) =>
  state?.schedule?.sessions?.filter(session => session?.trainerId === trainerId) || [];