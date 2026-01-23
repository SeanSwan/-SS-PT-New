/**
 * Schedule Slice for Redux State Management (Phase 2: Frontend Orchestration)
 * =============================================================================
 * 
 * ARCHITECTURAL TRANSFORMATION (Phase 2):
 * ✅ Updated to use unified universalMasterScheduleService
 * ✅ Role-based data fetching aligned with unified backend
 * ✅ Simplified thunks matching actual backend endpoints
 * ✅ Enhanced error handling and state management
 * ✅ Maintained backward compatibility where possible
 * 
 * CONNECTS TO:
 * - universalMasterScheduleService (Frontend Service)
 * - backend/services/sessions/session.service.mjs (Unified Backend)
 * 
 * This slice centralizes all schedule-related functionality:
 * - Fetches sessions from the unified API with role-based filtering
 * - Manages session booking, creation, and lifecycle operations
 * - Tracks session status and statistics with real-time updates
 * - Provides role-aware selectors for adaptive UI rendering
 * 
 * Used by all dashboard components (admin, trainer, client, user)
 * for consistent data and seamless UI interaction.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { universalMasterScheduleService } from '../../services/universal-master-schedule-service';
import { RootState } from '../store';

// Import types from the service (ensure consistency)
import type {
  Session,
  SessionEvent, 
  Client,
  Trainer,
  FilterOptions,
  ScheduleStats
} from '../../components/UniversalMasterSchedule/types';

// Redux-specific type extensions
export type ScheduleView = 'month' | 'week' | 'day' | 'agenda';

export interface TrainerOption extends Trainer {
  role: string;
}

export interface ClientOption extends Client {
  role: string;
}

interface ScheduleState {
  sessions: Session[];
  trainers: TrainerOption[];
  clients: ClientOption[];
  stats: ScheduleStats;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  fetched: boolean;
  // Universal Calendar View State (per Alchemist's Opus)
  view: ScheduleView;
  selectedDate: string; // ISO date string
  selectedSessionId: string | number | null;
  filters: {
    trainerId: string | number | null;
    status: string | null;
    showBlocked: boolean;
  };
  // Role-based context for adaptive UI
  currentUserRole: 'admin' | 'trainer' | 'client' | 'user' | null;
  currentUserId: string | null;
  // Additional state for real-time updates
  lastSyncTimestamp: string | null;
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
  fetched: false,
  // Universal Calendar View State
  view: 'week',
  selectedDate: new Date().toISOString(),
  selectedSessionId: null,
  filters: {
    trainerId: null,
    status: null,
    showBlocked: true
  },
  // Role-based context
  currentUserRole: null,
  currentUserId: null,
  lastSyncTimestamp: null
};

// ==================== ASYNC THUNKS (UNIFIED BACKEND INTEGRATION) ====================

/**
 * Universal fetchEvents - Role-based data fetching using unified backend
 * The unified backend automatically filters sessions based on user role via JWT token
 */
export const fetchEvents = createAsyncThunk(
  'schedule/fetchEvents',
  async (filters?: FilterOptions, { rejectWithValue }) => {
    try {
      // Use unified service - role-based filtering handled by backend
      const sessions = await universalMasterScheduleService.getSessions(filters);
      
      // Calculate stats from returned sessions
      const stats: ScheduleStats = {
        total: sessions.length,
        available: sessions.filter(s => s.status === 'available').length,
        booked: sessions.filter(s => s.status === 'booked' || s.status === 'scheduled').length,
        confirmed: sessions.filter(s => s.status === 'confirmed').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        blocked: sessions.filter(s => s.status === 'blocked').length,
        upcoming: sessions.filter(s => 
          ['available', 'booked', 'scheduled', 'confirmed'].includes(s.status) && 
          new Date(s.sessionDate || s.start) > new Date()
        ).length
      };
      
      return { 
        sessions, 
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while fetching sessions');
    }
  }
);

/**
 * Fetch calendar events for date range (optimized for calendar views)
 */
export const fetchCalendarEvents = createAsyncThunk(
  'schedule/fetchCalendarEvents',
  async (params: { start: string; end: string; filters?: { trainerId?: string; clientId?: string } }, { rejectWithValue }) => {
    try {
      const events = await universalMasterScheduleService.getCalendarEvents(
        params.start, 
        params.end, 
        params.filters
      );
      
      return events;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while fetching calendar events');
    }
  }
);

/**
 * Fetch trainers for dropdown selection
 */
export const fetchTrainers = createAsyncThunk(
  'schedule/fetchTrainers',
  async (_, { rejectWithValue }) => {
    try {
      const trainers = await universalMasterScheduleService.getTrainers();
      return trainers.map(trainer => ({ ...trainer, role: 'trainer' }));
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while fetching trainers');
    }
  }
);

/**
 * Fetch clients for dropdown selection (Admin/Trainer only)
 */
export const fetchClients = createAsyncThunk(
  'schedule/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const clients = await universalMasterScheduleService.getClients();
      return clients.map(client => ({ ...client, role: 'client' }));
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      // Return empty array if unauthorized (expected for non-admin/trainer users)
      return [];
    }
  }
);

/**
 * Fetch schedule statistics
 */
export const fetchScheduleStats = createAsyncThunk(
  'schedule/fetchScheduleStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await universalMasterScheduleService.getScheduleStats();
      return stats;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while fetching statistics');
    }
  }
);

// ==================== SESSION LIFECYCLE OPERATIONS ====================

/**
 * Book a session with role-appropriate logic
 */
export const bookSession = createAsyncThunk(
  'schedule/bookSession',
  async (params: { sessionId: string; bookingData?: any }, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.bookSession(
        params.sessionId, 
        params.bookingData
      );
      
      if (result.success) {
        return {
          sessionId: params.sessionId,
          session: result.session,
          message: result.message
        };
      } else {
        return rejectWithValue(result.message || 'Booking failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Booking failed: An unknown error occurred');
    }
  }
);

/**
 * Create available session slots (Admin only)
 */
export const createAvailableSessions = createAsyncThunk(
  'schedule/createAvailableSessions',
  async (sessions: Array<{
    start: string;
    end?: string;
    duration?: number;
    trainerId?: string;
    location?: string;
    notes?: string;
    sessionType?: string;
  }>, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.createAvailableSessions(sessions);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while creating sessions');
    }
  }
);

/**
 * Create recurring sessions (Admin only)
 */
export const createRecurringSessions = createAsyncThunk(
  'schedule/createRecurringSessions',
  async (config: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    times: string[];
    trainerId?: string;
    location?: string;
    duration?: number;
    sessionType?: string;
  }, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.createRecurringSessions(config);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while creating recurring sessions');
    }
  }
);

/**
 * Cancel a session
 */
export const cancelSession = createAsyncThunk(
  'schedule/cancelSession',
  async (params: { sessionId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.cancelSession(params.sessionId, params.reason);
      
      if (result.success) {
        return {
          sessionId: params.sessionId,
          message: result.message
        };
      } else {
        return rejectWithValue(result.message || 'Cancellation failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while cancelling session');
    }
  }
);

/**
 * Confirm a session (Admin/Trainer only)
 */
export const confirmSession = createAsyncThunk(
  'schedule/confirmSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.confirmSession(sessionId);
      
      if (result.success) {
        return {
          sessionId,
          session: result.session,
          message: result.message
        };
      } else {
        return rejectWithValue(result.message || 'Confirmation failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while confirming session');
    }
  }
);

/**
 * Complete a session (Admin/Trainer only)
 */
export const completeSession = createAsyncThunk(
  'schedule/completeSession',
  async (params: { sessionId: string; notes?: string }, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.completeSession(params.sessionId, params.notes);
      
      if (result.success) {
        return {
          sessionId: params.sessionId,
          session: result.session,
          message: result.message
        };
      } else {
        return rejectWithValue(result.message || 'Completion failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while completing session');
    }
  }
);

/**
 * Assign trainer to session (Admin only)
 */
export const assignTrainer = createAsyncThunk(
  'schedule/assignTrainer',
  async (params: { sessionId: string; trainerId: string }, { rejectWithValue }) => {
    try {
      const result = await universalMasterScheduleService.assignTrainer(params.sessionId, params.trainerId);
      
      if (result.success) {
        return {
          sessionId: params.sessionId,
          trainerId: params.trainerId,
          session: result.session,
          message: result.message
        };
      } else {
        return rejectWithValue(result.message || 'Assignment failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred while assigning trainer');
    }
  }
);

// ==================== REDUX SLICE DEFINITION ====================

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    resetScheduleStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    },
    
    // Manual session update for real-time sync
    updateSession: (state, action: PayloadAction<Session>) => {
      const index = state.sessions.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.sessions[index] = action.payload;
        
        // Recalculate stats
        const sessions = state.sessions;
        state.stats = {
          total: sessions.length,
          available: sessions.filter(s => s.status === 'available').length,
          booked: sessions.filter(s => s.status === 'booked' || s.status === 'scheduled').length,
          confirmed: sessions.filter(s => s.status === 'confirmed').length,
          completed: sessions.filter(s => s.status === 'completed').length,
          cancelled: sessions.filter(s => s.status === 'cancelled').length,
          blocked: sessions.filter(s => s.status === 'blocked').length,
          upcoming: sessions.filter(s => 
            ['available', 'booked', 'scheduled', 'confirmed'].includes(s.status) && 
            new Date(s.sessionDate || s.start) > new Date()
          ).length
        };
      }
    },
    
    // Add session for real-time sync
    addSession: (state, action: PayloadAction<Session>) => {
      state.sessions.push(action.payload);
      
      // Recalculate stats
      const sessions = state.sessions;
      state.stats = {
        total: sessions.length,
        available: sessions.filter(s => s.status === 'available').length,
        booked: sessions.filter(s => s.status === 'booked' || s.status === 'scheduled').length,
        confirmed: sessions.filter(s => s.status === 'confirmed').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        blocked: sessions.filter(s => s.status === 'blocked').length,
        upcoming: sessions.filter(s => 
          ['available', 'booked', 'scheduled', 'confirmed'].includes(s.status) && 
          new Date(s.sessionDate || s.start) > new Date()
        ).length
      };
    },
    
    // Remove session for real-time sync
    removeSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      
      // Recalculate stats
      const sessions = state.sessions;
      state.stats = {
        total: sessions.length,
        available: sessions.filter(s => s.status === 'available').length,
        booked: sessions.filter(s => s.status === 'booked' || s.status === 'scheduled').length,
        confirmed: sessions.filter(s => s.status === 'confirmed').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        blocked: sessions.filter(s => s.status === 'blocked').length,
        upcoming: sessions.filter(s => 
          ['available', 'booked', 'scheduled', 'confirmed'].includes(s.status) && 
          new Date(s.sessionDate || s.start) > new Date()
        ).length
      };
    },
    
    // Universal Calendar View Management (per Alchemist's Opus)
    setCalendarView: (state, action: PayloadAction<ScheduleView>) => {
      state.view = action.payload;
    },

    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },

    selectSession: (state, action: PayloadAction<string | number | null>) => {
      state.selectedSessionId = action.payload;
    },

    setFilters: (state, action: PayloadAction<Partial<ScheduleState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    setUserContext: (state, action: PayloadAction<{ role: 'admin' | 'trainer' | 'client' | 'user' | null; userId: string | null }>) => {
      state.currentUserRole = action.payload.role;
      state.currentUserId = action.payload.userId;
    },
    
    // Sync timestamp for real-time updates
    updateSyncTimestamp: (state) => {
      state.lastSyncTimestamp = new Date().toISOString();
    }
  },
  
  extraReducers: (builder) => {
    builder
      // ==================== FETCH EVENTS ====================
      .addCase(fetchEvents.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = action.payload.sessions;
        state.stats = action.payload.stats;
        state.fetched = true;
        state.lastSyncTimestamp = action.payload.timestamp;
        state.error = null;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // ==================== FETCH CALENDAR EVENTS ====================
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        // Update sessions with calendar events (merge or replace as needed)
        state.sessions = action.payload;
      })
      
      // ==================== FETCH TRAINERS ====================
      .addCase(fetchTrainers.fulfilled, (state, action) => {
        state.trainers = action.payload;
      })
      .addCase(fetchTrainers.rejected, (state, action) => {
        // Fail silently for unauthorized users
        state.trainers = [];
      })
      
      // ==================== FETCH CLIENTS ====================
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        // Fail silently for unauthorized users
        state.clients = [];
      })
      
      // ==================== FETCH STATS ====================
      .addCase(fetchScheduleStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      
      // ==================== BOOK SESSION ====================
      .addCase(bookSession.fulfilled, (state, action) => {
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex] = action.payload.session;
          
          // Update stats
          state.stats.available = Math.max(0, state.stats.available - 1);
          state.stats.booked++;
        }
      })
      
      // ==================== CREATE AVAILABLE SESSIONS ====================
      .addCase(createAvailableSessions.fulfilled, (state, action) => {
        // Add new sessions to the list
        if (action.payload.sessions && action.payload.sessions.length > 0) {
          state.sessions = [...state.sessions, ...action.payload.sessions];
          
          // Update stats
          state.stats.total += action.payload.sessions.length;
          state.stats.available += action.payload.sessions.length;
          state.stats.upcoming += action.payload.sessions.length;
        }
      })
      
      // ==================== CREATE RECURRING SESSIONS ====================
      .addCase(createRecurringSessions.fulfilled, (state, action) => {
        // Refresh sessions after creating recurring sessions
        // The component should dispatch fetchEvents after this succeeds
        state.fetched = false; // Mark as needing refresh
      })
      
      // ==================== CANCEL SESSION ====================
      .addCase(cancelSession.fulfilled, (state, action) => {
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.sessionId);
        
        if (sessionIndex !== -1) {
          const oldStatus = state.sessions[sessionIndex].status;
          state.sessions[sessionIndex].status = 'cancelled';
          
          // Update stats
          if (oldStatus in state.stats) {
            (state.stats as any)[oldStatus]--;
          }
          state.stats.cancelled++;
          
          if (['available', 'booked', 'scheduled', 'confirmed'].includes(oldStatus)) {
            state.stats.upcoming = Math.max(0, state.stats.upcoming - 1);
          }
        }
      })
      
      // ==================== CONFIRM SESSION ====================
      .addCase(confirmSession.fulfilled, (state, action) => {
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex] = action.payload.session;
          
          // Update stats
          state.stats.booked = Math.max(0, state.stats.booked - 1);
          state.stats.confirmed++;
        }
      })
      
      // ==================== COMPLETE SESSION ====================
      .addCase(completeSession.fulfilled, (state, action) => {
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex] = action.payload.session;
          
          // Update stats
          state.stats.confirmed = Math.max(0, state.stats.confirmed - 1);
          state.stats.completed++;
          state.stats.upcoming = Math.max(0, state.stats.upcoming - 1);
        }
      })
      
      // ==================== ASSIGN TRAINER ====================
      .addCase(assignTrainer.fulfilled, (state, action) => {
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.sessionId);
        
        if (sessionIndex !== -1) {
          state.sessions[sessionIndex] = action.payload.session;
        }
      });
  }
});

// ==================== EXPORT ACTIONS AND REDUCER ====================

export const { 
  resetScheduleStatus, 
  updateSession,
  addSession,
  removeSession,
  setCalendarView,
  setSelectedDate,
  selectSession,
  setFilters,
  resetFilters,
  setUserContext,
  updateSyncTimestamp
} = scheduleSlice.actions;

export default scheduleSlice.reducer;

// ==================== SELECTORS (ROLE-AWARE & NULL-SAFE) ====================

export const selectAllSessions = (state: RootState) => state?.schedule?.sessions || [];
export const selectScheduleStatus = (state: RootState) => state?.schedule?.status || 'idle';
export const selectScheduleError = (state: RootState) => state?.schedule?.error || null;
export const selectScheduleStats = (state: RootState) => state?.schedule?.stats || initialState.stats;
export const selectTrainers = (state: RootState) => state?.schedule?.trainers || [];
export const selectClients = (state: RootState) => state?.schedule?.clients || [];
export const selectSessionById = (state: RootState, sessionId: string) => 
  state?.schedule?.sessions?.find(session => session?.id === sessionId) || null;
export const selectSessionsByStatus = (state: RootState, status: string) => 
  state?.schedule?.sessions?.filter(session => session?.status === status) || [];
export const selectUpcomingSessions = (state: RootState) => 
  state?.schedule?.sessions?.filter(session => 
    ['available', 'booked', 'scheduled', 'confirmed'].includes(session?.status || '') && 
    new Date(session?.sessionDate || session.start || 0) > new Date()
  ) || [];
export const selectClientSessions = (state: RootState, clientId: string) =>
  state?.schedule?.sessions?.filter(session => session?.userId === clientId) || [];
export const selectTrainerSessions = (state: RootState, trainerId: string) =>
  state?.schedule?.sessions?.filter(session => session?.trainerId === trainerId) || [];

// Universal Calendar Selectors (per Alchemist's Opus)
export const selectCalendarView = (state: RootState) => state?.schedule?.view || 'week';
export const selectSelectedDate = (state: RootState) => state?.schedule?.selectedDate || new Date().toISOString();
export const selectSelectedSessionId = (state: RootState) => state?.schedule?.selectedSessionId ?? null;
export const selectScheduleFilters = (state: RootState) => state?.schedule?.filters || initialState.filters;
export const selectCurrentUserRole = (state: RootState) => state?.schedule?.currentUserRole || null;
export const selectCurrentUserId = (state: RootState) => state?.schedule?.currentUserId || null;
export const selectUserContext = (state: RootState) => ({
  role: state?.schedule?.currentUserRole || null,
  userId: state?.schedule?.currentUserId || null
});
export const selectLastSyncTimestamp = (state: RootState) => state?.schedule?.lastSyncTimestamp || null;

// ==================== ROLE-BASED SELECTORS FOR ADAPTIVE UI ====================

/**
 * Get sessions filtered for current user role (client view)
 */
export const selectUserRoleSessions = (state: RootState) => {
  const sessions = selectAllSessions(state);
  const userRole = selectCurrentUserRole(state);
  const userId = selectCurrentUserId(state);
  
  if (!userRole || !userId) return sessions;
  
  switch (userRole) {
    case 'admin':
      return sessions; // Admin sees everything
      
    case 'trainer':
      return sessions.filter(session => 
        session.trainerId === userId || session.status === 'available'
      );
      
    case 'client':
      return sessions.filter(session => 
        session.userId === userId || session.status === 'available'
      );
      
    case 'user':
    default:
      return sessions.filter(session => session.status === 'available');
  }
};

/**
 * Get available actions for a session based on user role
 */
export const selectSessionActions = (state: RootState, sessionId: string) => {
  const session = selectSessionById(state, sessionId);
  const userRole = selectCurrentUserRole(state);
  const userId = selectCurrentUserId(state);
  
  if (!session || !userRole) return [];
  
  return universalMasterScheduleService.getRoleBasedActions(session, userRole);
};

/**
 * Check if user can perform specific action on session
 */
export const selectCanPerformAction = (state: RootState, sessionId: string, action: string) => {
  const session = selectSessionById(state, sessionId);
  const userRole = selectCurrentUserRole(state);
  const userId = selectCurrentUserId(state);
  
  if (!session || !userRole) return false;
  
  return universalMasterScheduleService.canPerformAction(session, action, userRole, userId || undefined);
};
