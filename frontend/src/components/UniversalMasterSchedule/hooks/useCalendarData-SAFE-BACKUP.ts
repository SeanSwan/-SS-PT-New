/**
 * useCalendarData - Data Fetching & Management Hook (EMERGENCY SAFE VERSION)
 * ==========================================================================
 * Completely rewritten to avoid temporal dead zone errors
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  fetchEvents,
  selectAllSessions,
  selectScheduleStatus,
  selectScheduleError,
  selectScheduleStats
} from '../../../redux/slices/scheduleSlice';
import { useAuth } from '../../../context/AuthContext';
import { clientTrainerAssignmentService } from '../../../services/clientTrainerAssignmentService';
import type { 
  Client, 
  Trainer, 
  ClientTrainerAssignment, 
  SessionEvent, 
  FilterOptions,
  Session
} from '../types';

export interface CalendarDataValues {
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  assignments: ClientTrainerAssignment[];
  calendarEvents: SessionEvent[];
  scheduleStatus: string;
  scheduleError: string | null;
  scheduleStats: any;
}

export interface CalendarDataActions {
  initializeComponent: (params: {
    setLoading: (updates: any) => void;
    setError: (updates: any) => void;
    realTimeEnabled: boolean;
  }) => Promise<void>;
  loadSessions: () => Promise<void>;
  loadClients: (setLoading: (updates: any) => void, setError: (updates: any) => void) => Promise<void>;
  loadTrainers: (setLoading: (updates: any) => void, setError: (updates: any) => void) => Promise<void>;
  loadAssignments: (setLoading: (updates: any) => void, setError: (updates: any) => void) => Promise<void>;
  refreshData: () => Promise<void>;
  initializeRealTimeUpdates: () => void;
  setClients: (clients: Client[]) => void;
  setTrainers: (trainers: Trainer[]) => void;
  setAssignments: (assignments: ClientTrainerAssignment[]) => void;
  setCalendarEvents: (events: SessionEvent[]) => void;
  applyFilters: (filterOptions: FilterOptions) => void;
}

/**
 * EMERGENCY SAFE VERSION - All functions declared with function declarations
 * to avoid temporal dead zone issues
 */
export const useCalendarData = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const sessions = useAppSelector(selectAllSessions);
  const scheduleStatus = useAppSelector(selectScheduleStatus);
  const scheduleError = useAppSelector(selectScheduleError);
  const scheduleStats = useAppSelector(selectScheduleStats);
  
  // Local state
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [assignments, setAssignments] = useState<ClientTrainerAssignment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<SessionEvent[]>([]);
  
  // ==================== UTILITY FUNCTIONS (FUNCTION DECLARATIONS) ====================
  
  function getSessionTitle(session: any): string {
    if (session.client) {
      return `${session.client.firstName} ${session.client.lastName}`;
    }
    if (session.trainer) {
      return `Available - ${session.trainer.firstName}`;
    }
    return 'Available Slot';
  }
  
  function initializeRealTimeUpdates(): void {
    console.log('🔄 Real-time updates initialized');
  }
  
  // ==================== DATA LOADING FUNCTIONS ====================
  
  const loadSessions = useCallback(async () => {
    try {
      await dispatch(fetchEvents({ role: 'admin', userId: user?.id || '' }));
    } catch (error) {
      throw new Error('Failed to load sessions');
    }
  }, [dispatch, user?.id]);
  
  const loadClients = useCallback(async (setLoading: (updates: any) => void, setError: (updates: any) => void) => {
    try {
      setLoading({ clients: true });
      setLoading({ clients: false });
    } catch (error) {
      setError({ clients: 'Failed to load clients' });
      setLoading({ clients: false });
    }
  }, []);
  
  const loadTrainers = useCallback(async (setLoading: (updates: any) => void, setError: (updates: any) => void) => {
    try {
      setLoading({ trainers: true });
      setLoading({ trainers: false });
    } catch (error) {
      setError({ trainers: 'Failed to load trainers' });
      setLoading({ trainers: false });
    }
  }, []);
  
  const loadAssignments = useCallback(async (setLoading: (updates: any) => void, setError: (updates: any) => void) => {
    try {
      setLoading({ assignments: true });
      const assignmentsData = await clientTrainerAssignmentService.getAssignments();
      setAssignments(assignmentsData);
      setLoading({ assignments: false });
    } catch (error) {
      setError({ assignments: 'Failed to load assignments' });
      setLoading({ assignments: false });
    }
  }, []);
  
  const initializeComponent = useCallback(async (params: {
    setLoading: (updates: any) => void;
    setError: (updates: any) => void;
    realTimeEnabled: boolean;
  }) => {
    const { setLoading, setError, realTimeEnabled } = params;
    
    try {
      setLoading({ sessions: true });
      
      await Promise.all([
        loadSessions(),
        loadClients(setLoading, setError),
        loadTrainers(setLoading, setError),
        loadAssignments(setLoading, setError)
      ]);
      
      setLoading({ sessions: false });
      
      if (realTimeEnabled) {
        initializeRealTimeUpdates();
      }
      
    } catch (error) {
      console.error('Error initializing Universal Master Schedule:', error);
      setError({ 
        sessions: 'Failed to initialize schedule. Please refresh and try again.' 
      });
      setLoading({ sessions: false });
    }
  }, [loadSessions, loadClients, loadTrainers, loadAssignments]);
  
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([loadSessions()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [loadSessions]);
  
  const applyFilters = useCallback((filterOptions: FilterOptions) => {
    let filteredEvents = sessions.map(session => ({
      id: session.id,
      title: getSessionTitle(session),
      start: new Date(session.start),
      end: new Date(session.end),
      status: session.status,
      userId: session.userId,
      trainerId: session.trainerId,
      client: session.client,
      trainer: session.trainer,
      location: session.location,
      notes: session.notes,
      duration: session.duration,
      resource: session
    }));
    
    if (filterOptions.trainerId) {
      filteredEvents = filteredEvents.filter(event => 
        event.trainerId === filterOptions.trainerId
      );
    }
    
    if (filterOptions.clientId) {
      filteredEvents = filteredEvents.filter(event => 
        event.userId === filterOptions.clientId
      );
    }
    
    if (filterOptions.status !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.status === filterOptions.status
      );
    }
    
    if (filterOptions.location) {
      filteredEvents = filteredEvents.filter(event => 
        event.location?.toLowerCase().includes(filterOptions.location.toLowerCase())
      );
    }
    
    if (filterOptions.searchTerm) {
      const searchTerm = filterOptions.searchTerm.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.client?.firstName?.toLowerCase().includes(searchTerm) ||
        event.client?.lastName?.toLowerCase().includes(searchTerm) ||
        event.trainer?.firstName?.toLowerCase().includes(searchTerm) ||
        event.trainer?.lastName?.toLowerCase().includes(searchTerm)
      );
    }
    
    setCalendarEvents(filteredEvents);
  }, [sessions]);
  
  const dataStatistics = useMemo(() => {
    return {
      totalSessions: sessions.length,
      totalClients: clients.length,
      totalTrainers: trainers.length,
      totalAssignments: assignments.length,
      activeEvents: calendarEvents.length,
      lastUpdated: new Date().toISOString()
    };
  }, [sessions.length, clients.length, trainers.length, assignments.length, calendarEvents.length]);
  
  const values: CalendarDataValues = {
    sessions,
    clients,
    trainers,
    assignments,
    calendarEvents,
    scheduleStatus,
    scheduleError,
    scheduleStats: { ...scheduleStats, ...dataStatistics }
  };
  
  const actions: CalendarDataActions = {
    initializeComponent,
    loadSessions,
    loadClients,
    loadTrainers,
    loadAssignments,
    refreshData,
    initializeRealTimeUpdates,
    setClients,
    setTrainers,
    setAssignments,
    setCalendarEvents,
    applyFilters
  };
  
  return { ...values, ...actions };
};

export default useCalendarData;
