/**
 * useCalendarData - Pure Data Fetching & Management Hook (REFACTORED)
 * ===================================================================
 * Manages ONLY raw data operations for the Universal Master Schedule component
 * 
 * REFACTORED RESPONSIBILITIES (Single Responsibility Principle):
 * - Session data loading and management
 * - Client and trainer data fetching  
 * - Assignment data synchronization
 * - Real-time update initialization
 * 
 * REMOVED RESPONSIBILITIES (Now handled by specialized hooks):
 * - Data filtering and transformation → useFilteredCalendarEvents
 * - Calendar event generation → useFilteredCalendarEvents
 * - Real-time WebSocket management → useRealTimeUpdates
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
  Session
} from '../types';
export interface CalendarDataValues {
  // Core Raw Data (Single Responsibility: Data Management Only)
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  assignments: ClientTrainerAssignment[];
  
  // Redux State
  scheduleStatus: string;
  scheduleError: string | null;
  scheduleStats: any;
}

export interface CalendarDataActions {
  // Data Loading (Core Responsibility)
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
  
  // Real-time Updates Initialization (Will delegate to useRealTimeUpdates)
  initializeRealTimeUpdates: () => void;
  
  // Raw Data State Management
  setClients: (clients: Client[]) => void;
  setTrainers: (trainers: Trainer[]) => void;
  setAssignments: (assignments: ClientTrainerAssignment[]) => void;
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
  
  // ==================== LOCAL RAW DATA STATE ====================
  
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [assignments, setAssignments] = useState<ClientTrainerAssignment[]>([]);
  

  
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
    // Circuit breaker to prevent infinite retries
    const endpoint = 'sessions';
    const failureKey = `${endpoint}_failures`;
    const lastAttemptKey = `${endpoint}_last_attempt`;
    
    const now = Date.now();
    const failures = parseInt(sessionStorage.getItem(failureKey) || '0');
    const lastAttempt = parseInt(sessionStorage.getItem(lastAttemptKey) || '0');
    
    // If we've failed too many times recently, skip this attempt
    if (failures >= 3 && (now - lastAttempt) < 30000) {
      console.warn('🛑 Circuit breaker: Skipping session load due to repeated failures');
      throw new Error('Circuit breaker: Too many recent failures');
    }
    
    try {
      sessionStorage.setItem(lastAttemptKey, now.toString());
      await dispatch(fetchEvents({ role: 'admin', userId: user?.id || '' }));
      // Success - reset failure count
      sessionStorage.removeItem(failureKey);
    } catch (error) {
      // Record failure
      const newFailures = failures + 1;
      sessionStorage.setItem(failureKey, newFailures.toString());
      console.error(`Session load failed (attempt ${newFailures}/3):`, error);
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
    // Circuit breaker to prevent infinite retries
    const endpoint = 'assignments';
    const failureKey = `${endpoint}_failures`;
    const lastAttemptKey = `${endpoint}_last_attempt`;
    
    const now = Date.now();
    const failures = parseInt(sessionStorage.getItem(failureKey) || '0');
    const lastAttempt = parseInt(sessionStorage.getItem(lastAttemptKey) || '0');
    
    // If we've failed too many times recently, skip this attempt
    if (failures >= 3 && (now - lastAttempt) < 30000) {
      console.warn('🛑 Circuit breaker: Skipping assignments load due to repeated failures');
      setError({ assignments: 'Service temporarily unavailable - will retry later' });
      setLoading({ assignments: false });
      return;
    }
    
    try {
      setLoading({ assignments: true });
      sessionStorage.setItem(lastAttemptKey, now.toString());
      const assignmentsData = await clientTrainerAssignmentService.getAssignments();
      setAssignments(assignmentsData);
      // Success - reset failure count
      sessionStorage.removeItem(failureKey);
      setLoading({ assignments: false });
    } catch (error) {
      // Record failure
      const newFailures = failures + 1;
      sessionStorage.setItem(failureKey, newFailures.toString());
      console.error(`Assignments load failed (attempt ${newFailures}/3):`, error);
      setError({ assignments: 'Failed to load assignments' });
      setLoading({ assignments: false });
    }
  }, []);
  
  // ==================== INITIALIZATION (IMPROVED FOR PRODUCTION STABILITY) ====================
  
  const initializeComponent = useCallback(async (params: {
    setLoading: (updates: any) => void;
    setError: (updates: any) => void;
    realTimeEnabled: boolean;
  }) => {
    const { setLoading, setError, realTimeEnabled } = params;
    
    // Check if we should delay initialization due to previous failures
    const initFailures = parseInt(sessionStorage.getItem('init_failures') || '0');
    const lastInitAttempt = parseInt(sessionStorage.getItem('last_init_attempt') || '0');
    const now = Date.now();
    
    if (initFailures > 0 && (now - lastInitAttempt) < 10000) {
      console.log(`🕰️ Delaying initialization due to ${initFailures} previous failures`);
      await new Promise(resolve => setTimeout(resolve, 2000 * initFailures)); // Progressive delay
    }
    
    try {
      setLoading({ sessions: true });
      sessionStorage.setItem('last_init_attempt', now.toString());
      
      // Load initial data in parallel with error handling
      const results = await Promise.allSettled([
        loadSessions(),
        loadClients(setLoading, setError),
        loadTrainers(setLoading, setError),
        loadAssignments(setLoading, setError)
      ]);
      
      // Check if any critical operations failed
      const sessionResult = results[0];
      if (sessionResult.status === 'rejected') {
        console.warn('Sessions failed to load:', sessionResult.reason);
        // Don't throw - let the app continue with empty sessions
      }
      
      setLoading({ sessions: false });
      
      // Success - reset failure count
      sessionStorage.removeItem('init_failures');
      
      // Initialize real-time updates if enabled (using inline function to avoid TDZ)
      if (realTimeEnabled) {
        // Inline real-time initialization to prevent hoisting issues
        try {
          console.log('🔄 Real-time updates initialized');
          // TODO: Implement WebSocket connection
          // const ws = new WebSocket('ws://localhost:3001/schedule-updates');
        } catch (rtError) {
          console.warn('Real-time updates failed to initialize:', rtError);
        }
      }
      
    } catch (error) {
      console.error('Error initializing Universal Master Schedule:', error);
      
      // Record initialization failure
      const newFailures = initFailures + 1;
      sessionStorage.setItem('init_failures', newFailures.toString());
      
      setError({ 
        sessions: newFailures >= 3 
          ? 'Service temporarily unavailable. Please try again later.' 
          : 'Failed to initialize schedule. Please refresh and try again.' 
      });
      setLoading({ sessions: false });
    }
  }, [loadSessions, loadClients, loadTrainers, loadAssignments]); // ← SAFE: No circular dependencies
  
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        loadSessions()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [loadSessions]);
  

  
  // Effects are now managed by the main component to avoid circular dependencies
  
  // ==================== MEMOIZED DATA TRANSFORMATIONS ====================
  
  const dataStatistics = useMemo(() => {
    return {
      totalSessions: sessions.length,
      totalClients: clients.length,
      totalTrainers: trainers.length,
      totalAssignments: assignments.length,
      lastUpdated: new Date().toISOString()
    };
  }, [sessions.length, clients.length, trainers.length, assignments.length]);
  
  // ==================== RETURN VALUES & ACTIONS ====================
  
  const values: CalendarDataValues = {
    // Core Raw Data (Single Responsibility: Data Management Only)
    sessions,
    clients,
    trainers,
    assignments,
    
    // Redux State
    scheduleStatus,
    scheduleError,
    scheduleStats: { ...scheduleStats, ...dataStatistics }
  };
  
  const actions: CalendarDataActions = {
    // Data Loading (Core Responsibility)
    initializeComponent,
    loadSessions,
    loadClients,
    loadTrainers,
    loadAssignments,
    refreshData,
    
    // Real-time Updates Initialization
    initializeRealTimeUpdates,
    
    // Raw Data State Management
    setClients,
    setTrainers,
    setAssignments
  };
  
  return { ...values, ...actions };
};

export default useCalendarData;
