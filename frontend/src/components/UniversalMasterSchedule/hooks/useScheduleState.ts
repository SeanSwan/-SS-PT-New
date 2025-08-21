/**
 * useScheduleState - Modern State Management Hook
 * ==============================================
 * Advanced state management with React 18 patterns
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';

interface ScheduleState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: ScheduleData | null;
  error: ScheduleError | null;
  lastUpdated: Date | null;
}

interface ScheduleData {
  events: CalendarEvent[];
  metadata: {
    totalCount: number;
    filteredCount: number;
    lastSync: string;
  };
}

interface ScheduleError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'session' | 'block' | 'appointment';
  status: 'confirmed' | 'pending' | 'cancelled';
  participants: Array<{
    id: string;
    name: string;
    role: 'client' | 'trainer' | 'admin';
    avatar?: string;
  }>;
  metadata: Record<string, unknown>;
}

type ScheduleAction = 
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: ScheduleData }
  | { type: 'LOAD_ERROR'; payload: ScheduleError }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'RESET' };

const scheduleReducer = (state: ScheduleState, action: ScheduleAction): ScheduleState => {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading', error: null };
    case 'LOAD_SUCCESS':
      return { 
        ...state, 
        status: 'success', 
        data: action.payload, 
        lastUpdated: new Date(),
        error: null 
      };
    case 'LOAD_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'UPDATE_EVENT':
      if (!state.data) return state;
      return {
        ...state,
        data: {
          ...state.data,
          events: state.data.events.map(event => 
            event.id === action.payload.id ? action.payload : event
          )
        }
      };
    case 'DELETE_EVENT':
      if (!state.data) return state;
      return {
        ...state,
        data: {
          ...state.data,
          events: state.data.events.filter(event => event.id !== action.payload)
        }
      };
    case 'RESET':
      return { status: 'idle', data: null, error: null, lastUpdated: null };
    default:
      return state;
  }
};

export const useScheduleState = ({ 
  userRole = 'user', 
  timezone = 'UTC' 
}: { 
  userRole?: string; 
  timezone?: string; 
} = {}) => {
  const [state, dispatch] = useReducer(scheduleReducer, {
    status: 'idle',
    data: null,
    error: null,
    lastUpdated: null
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const refreshData = useCallback(async () => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    dispatch({ type: 'LOAD_START' });
    
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: ScheduleData = {
        events: [
          {
            id: '1',
            title: 'Personal Training Session',
            start: new Date(),
            end: new Date(Date.now() + 60 * 60 * 1000),
            type: 'session',
            status: 'confirmed',
            participants: [
              { id: '1', name: 'John Doe', role: 'client' },
              { id: '2', name: 'Jane Trainer', role: 'trainer' }
            ],
            metadata: { location: 'Gym A' }
          }
        ],
        metadata: {
          totalCount: 1,
          filteredCount: 1,
          lastSync: new Date().toISOString()
        }
      };
      
      dispatch({ type: 'LOAD_SUCCESS', payload: mockData });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        dispatch({ 
          type: 'LOAD_ERROR', 
          payload: {
            code: 'FETCH_ERROR',
            message: error.message,
            timestamp: new Date()
          }
        });
      }
    }
  }, []);
  
  const isStale = state.lastUpdated ? 
    Date.now() - state.lastUpdated.getTime() > 5 * 60 * 1000 : // 5 minutes
    true;
  
  useEffect(() => {
    refreshData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refreshData]);
  
  return {
    state,
    dispatch,
    refreshData,
    isStale
  };
};
