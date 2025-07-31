/**
 * useCalendarData - Data Fetching & Management Hook
 * =================================================
 * Manages all data operations for the Universal Master Schedule component
 * 
 * RESPONSIBILITIES:
 * - Session data loading and management
 * - Client and trainer data fetching
 * - Assignment data synchronization
 * - Real-time data updates
 * - Data filtering and transformation
 * - Calendar event generation
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
  // Core Data
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  assignments: ClientTrainerAssignment[];
  calendarEvents: SessionEvent[];
  
  // Redux State
  scheduleStatus: string;
  scheduleError: string | null;
  scheduleStats: any;
}

export interface CalendarDataActions {
  // Data Loading
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
  
  // Real-time Updates
  initializeRealTimeUpdates: () => void;
  
  // Data Management
  setClients: (clients: Client[]) => void;
  setTrainers: (trainers: Trainer[]) => void;
  setAssignments: (assignments: ClientTrainerAssignment[]) => void;
  setCalendarEvents: (events: SessionEvent[]) => void;
  
  // Filtering
  applyFilters: (filterOptions: FilterOptions) => void;
}

/**
 * useCalendarData Hook
 * 
 * Provides comprehensive data management for the Universal Master Schedule
 * with automatic filtering, real-time updates, and error handling.
 */
export const useCalendarData = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const sessions = useAppSelector(selectAllSessions);
  const scheduleStatus = useAppSelector(selectScheduleStatus);
  const scheduleError = useAppSelector(selectScheduleError);
  const scheduleStats = useAppSelector(selectScheduleStats);
  
  // ==================== LOCAL DATA STATE ====================
  
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [assignments, setAssignments] = useState<ClientTrainerAssignment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<SessionEvent[]>([]);
  
  // ==================== UTILITY FUNCTIONS ====================
  
  const getSessionTitle = useCallback((session: any): string => {
    if (session.client) {
      return `${session.client.firstName} ${session.client.lastName}`;
    }
    if (session.trainer) {
      return `Available - ${session.trainer.firstName}`;
    }
    return 'Available Slot';
  }, []);
  
  // ==================== REAL-TIME UPDATES ====================
  
  const initializeRealTimeUpdates = useCallback(() => {
    // WebSocket or similar real-time update implementation
    console.log('🔄 Real-time updates initialized');
    
    // TODO: Implement WebSocket connection
    // const ws = new WebSocket('ws://localhost:3001/schedule-updates');
    // ws.onmessage = (event) => {
    //   const update = JSON.parse(event.data);
    //   if (update.type === 'session-updated') {
    //     refreshData();
    //   }
    // };
    
    // Return cleanup function
    // return () => ws.close();
  }, []);
  
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
      // TODO: Implementation would call client service
      // const clientsData = await clientService.getClients();
      // setClients(clientsData);
      setLoading({ clients: false });
    } catch (error) {
      setError({ clients: 'Failed to load clients' });
      setLoading({ clients: false });
    }
  }, []);
  
  const loadTrainers = useCallback(async (setLoading: (updates: any) => void, setError: (updates: any) => void) => {
    try {
      setLoading({ trainers: true });
      // TODO: Implementation would call trainer service
      // const trainersData = await trainerService.getTrainers();
      // setTrainers(trainersData);
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
  
  // ==================== INITIALIZATION ====================
  
  const initializeComponent = useCallback(async (params: {
    setLoading: (updates: any) => void;
    setError: (updates: any) => void;
    realTimeEnabled: boolean;
  }) => {
    const { setLoading, setError, realTimeEnabled } = params;
    
    try {
      setLoading({ sessions: true });
      
      // Load initial data in parallel
      await Promise.all([
        loadSessions(),
        loadClients(setLoading, setError),
        loadTrainers(setLoading, setError),
        loadAssignments(setLoading, setError)
      ]);
      
      setLoading({ sessions: false });
      
      // Initialize real-time updates if enabled
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
  }, [loadSessions, loadClients, loadTrainers, loadAssignments, initializeRealTimeUpdates]);
  
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        loadSessions()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [loadSessions]);
  
  // ==================== FILTERING LOGIC ====================
  
  const applyFilters = useCallback((filterOptions: FilterOptions) => {
    // Transform sessions into calendar events with filtering
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
    
    // Apply trainer filter
    if (filterOptions.trainerId) {
      filteredEvents = filteredEvents.filter(event => 
        event.trainerId === filterOptions.trainerId
      );
    }
    
    // Apply client filter
    if (filterOptions.clientId) {
      filteredEvents = filteredEvents.filter(event => 
        event.userId === filterOptions.clientId
      );
    }
    
    // Apply status filter
    if (filterOptions.status !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.status === filterOptions.status
      );
    }
    
    // Apply location filter
    if (filterOptions.location) {
      filteredEvents = filteredEvents.filter(event => 
        event.location?.toLowerCase().includes(filterOptions.location.toLowerCase())
      );
    }
    
    // Apply search term filter
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
    
    // Apply date range filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filterOptions.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          filteredEvents = filteredEvents.filter(event => 
            event.start >= startDate && event.start < new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
          );
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filteredEvents = filteredEvents.filter(event => event.start >= startDate);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filteredEvents = filteredEvents.filter(event => event.start >= startDate);
          break;
        case 'custom':
          if (filterOptions.customDateStart) {
            const customStart = new Date(filterOptions.customDateStart);
            filteredEvents = filteredEvents.filter(event => event.start >= customStart);
          }
          if (filterOptions.customDateEnd) {
            const customEnd = new Date(filterOptions.customDateEnd);
            filteredEvents = filteredEvents.filter(event => event.start <= customEnd);
          }
          break;
      }
    }
    
    setCalendarEvents(filteredEvents);
  }, [sessions, getSessionTitle]);
  
  // Effects are now managed by the main component to avoid circular dependencies
  
  // ==================== MEMOIZED DATA TRANSFORMATIONS ====================
  
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
  
  // ==================== RETURN VALUES & ACTIONS ====================
  
  const values: CalendarDataValues = {
    // Core Data
    sessions,
    clients,
    trainers,
    assignments,
    calendarEvents,
    
    // Redux State
    scheduleStatus,
    scheduleError,
    scheduleStats: { ...scheduleStats, ...dataStatistics }
  };
  
  const actions: CalendarDataActions = {
    // Data Loading
    initializeComponent,
    loadSessions,
    loadClients,
    loadTrainers,
    loadAssignments,
    refreshData,
    
    // Real-time Updates
    initializeRealTimeUpdates,
    
    // Data Management
    setClients,
    setTrainers,
    setAssignments,
    setCalendarEvents,
    
    // Filtering
    applyFilters
  };
  
  return { ...values, ...actions };
};

export default useCalendarData;
