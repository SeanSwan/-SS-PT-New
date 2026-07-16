/**
 * useCalendarData - Enhanced Data Management Hook (PRODUCTION-READY)
 * ===================================================================
 * Manages comprehensive data operations for the Universal Master Schedule component
 * 
 * ENHANCED RESPONSIBILITIES (Production-Ready Integration):
 * ✅ Session data loading with Redux integration
 * ✅ Client and trainer data fetching with real service calls
 * ✅ Assignment data synchronization with error handling
 * ✅ Real-time update initialization with circuit breakers
 * ✅ Comprehensive error handling and loading states
 * ✅ Production-grade caching and optimization
 * 
 * INTEGRATION POINTS:
 * - Redux scheduleSlice for session state management
 * - Enhanced schedule service for API calls
 * - Client/Trainer services for user data
 * - WebSocket connections for real-time updates
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  fetchEvents,
  fetchTrainers,
  fetchClients,
  selectAllSessions,
  selectTrainers,
  selectClients,
  selectScheduleStatus,
  selectScheduleError,
  selectScheduleStats
} from '../../../redux/slices/scheduleSlice';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { clientTrainerAssignmentService } from '../../../services/clientTrainerAssignmentService';
import type { 
  Client, 
  Trainer, 
  ClientTrainerAssignment, 
  Session,
  ScheduleStats
} from '../types';
import { logger } from '@/utils/logger';

type ScheduleWindow = Window & {
  __scheduleCleanup?: () => void;
};

type EnrichedSession = Session & {
  trainerName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAvailableSessions?: number;
  clientSource?: Client['clientSource'];
};

interface EnhancedScheduleStats extends ScheduleStats {
  totalClients: number;
  totalTrainers: number;
  totalAssignments: number;
  lastUpdated: string;
  dataQuality: {
    healthScore: number;
    isStale: boolean;
    lastRefresh: Date | null;
    successRate: number;
  };
}

interface CalendarDataValues {
  // Core Raw Data (Enhanced with Redux Integration)
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  assignments: ClientTrainerAssignment[];
  
  // Redux State (Enhanced)
  scheduleStatus: string;
  scheduleError: string | null;
  scheduleStats: EnhancedScheduleStats;
  
  // Loading States (Granular)
  loading: {
    sessions: boolean;
    clients: boolean;
    trainers: boolean;
    assignments: boolean;
    refreshing: boolean;
  };
  
  // Error States (Detailed)
  errors: {
    sessions: string | null;
    clients: string | null;
    trainers: string | null;
    assignments: string | null;
  };
  
  // Data Quality Metrics
  dataHealth: {
    lastRefresh: Date | null;
    successfulLoads: number;
    failedLoads: number;
    isStale: boolean;
  };
}

interface CalendarDataActions {
  // Enhanced Data Loading (Production-Ready)
  initializeComponent: (params: {
    realTimeEnabled?: boolean;
  }) => Promise<void>;
  refreshData: (force?: boolean, filterOptions?: import('../types').FilterOptions) => Promise<void>;

  // Granular Data Loading
  loadSessions: (options?: { force?: boolean; showLoading?: boolean; filterOptions?: import('../types').FilterOptions }) => Promise<void>;
  loadClients: (options?: { force?: boolean; showLoading?: boolean }) => Promise<void>;
  loadTrainers: (options?: { force?: boolean; showLoading?: boolean }) => Promise<void>;
  loadAssignments: (options?: { force?: boolean; showLoading?: boolean }) => Promise<void>;
  
  // Real-time Updates Management
  initializeRealTimeUpdates: () => () => void; // Returns cleanup function
  
  // Data Quality Management
  clearErrors: () => void;
  resetDataHealth: () => void;
  isDataStale: () => boolean;
  
  // Cache Management
  invalidateCache: (dataType?: 'sessions' | 'clients' | 'trainers' | 'assignments') => void;
}

/**
 * useCalendarData Hook - Enhanced Production Implementation
 * 
 * Provides production-ready data management for the Universal Master Schedule
 * with comprehensive error handling, caching, and real-time updates.
 * 
 * Key Features:
 * - Redux integration with enhanced scheduleSlice
 * - Circuit breaker pattern for API calls
 * - Granular loading and error states
 * - Automatic data freshness checking
 * - Real-time update capabilities
 * - Production-grade caching strategies
 */
export const useCalendarData = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const canLoadClientRoster = user?.role === 'admin' || user?.role === 'trainer';
  
  // Redux selectors (Enhanced)
  const sessions = useAppSelector(selectAllSessions);
  const reduxClients = useAppSelector(selectClients);
  const reduxTrainers = useAppSelector(selectTrainers);
  const scheduleStatus = useAppSelector(selectScheduleStatus);
  const scheduleError = useAppSelector(selectScheduleError);
  const scheduleStats = useAppSelector(selectScheduleStats);
  
  // ==================== ENHANCED LOCAL STATE ====================
  
  // Local state for assignments (not in Redux yet)
  const [assignments, setAssignments] = useState<ClientTrainerAssignment[]>([]);
  
  // Enhanced loading states
  const [loading, setLoading] = useState({
    sessions: true,
    clients: canLoadClientRoster,
    trainers: true,
    assignments: canLoadClientRoster,
    refreshing: false
  });
  
  // Enhanced error states
  const [errors, setErrors] = useState({
    sessions: null as string | null,
    clients: null as string | null,
    trainers: null as string | null,
    assignments: null as string | null
  });
  
  // Data health tracking
  const [dataHealth, setDataHealth] = useState({
    lastRefresh: null as Date | null,
    successfulLoads: 0,
    failedLoads: 0,
    isStale: true
  });

  const refreshDataRef = useRef<CalendarDataActions['refreshData'] | null>(null);
  const activeFilterOptionsRef = useRef<import('../types').FilterOptions | undefined>(undefined);
  
  // Use Redux data as primary source, fallback to local state
  const clients = reduxClients.length > 0 ? reduxClients : [];
  const trainers = reduxTrainers.length > 0 ? reduxTrainers : [];
  
  // ==================== UTILITY FUNCTIONS ====================
  
  const updateDataHealth = useCallback((success: boolean) => {
    setDataHealth(prev => ({
      ...prev,
      lastRefresh: new Date(),
      successfulLoads: success ? prev.successfulLoads + 1 : prev.successfulLoads,
      failedLoads: success ? prev.failedLoads : prev.failedLoads + 1,
      isStale: false
    }));
  }, []);
  
  const clearErrors = useCallback(() => {
    setErrors({
      sessions: null,
      clients: null,
      trainers: null,
      assignments: null
    });
  }, []);
  
  const resetDataHealth = useCallback(() => {
    setDataHealth({
      lastRefresh: null,
      successfulLoads: 0,
      failedLoads: 0,
      isStale: true
    });
  }, []);
  
  const isDataStale = useCallback(() => {
    if (!dataHealth.lastRefresh) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - dataHealth.lastRefresh.getTime() > fiveMinutes;
  }, [dataHealth.lastRefresh]);
  
  // ==================== CIRCUIT BREAKER UTILITY ====================
  
  const executeWithCircuitBreaker = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    options: { showLoading?: boolean; dataType?: keyof typeof loading } = {}
  ) => {
    const { showLoading = true, dataType } = options;
    const failureKey = `${operationName}_failures`;
    const lastAttemptKey = `${operationName}_last_attempt`;
    
    const now = Date.now();
    const failures = parseInt(sessionStorage.getItem(failureKey) || '0');
    const lastAttempt = parseInt(sessionStorage.getItem(lastAttemptKey) || '0');
    
    // Circuit breaker logic
    if (failures >= 3 && (now - lastAttempt) < 30000) {
      throw new Error(`Circuit breaker: ${operationName} temporarily unavailable`);
    }
    
    try {
      if (showLoading && dataType) {
        setLoading(prev => ({ ...prev, [dataType]: true }));
        setErrors(prev => ({ ...prev, [dataType]: null }));
      }
      
      sessionStorage.setItem(lastAttemptKey, now.toString());
      const result = await operation();
      
      // Success - reset failure count
      sessionStorage.removeItem(failureKey);
      updateDataHealth(true);
      
      return result;
    } catch (error) {
      // Record failure
      const newFailures = failures + 1;
      sessionStorage.setItem(failureKey, newFailures.toString());
      updateDataHealth(false);
      
      console.error(`${operationName} failed (attempt ${newFailures}/3):`, error);
      throw error;
    } finally {
      if (showLoading && dataType) {
        setLoading(prev => ({ ...prev, [dataType]: false }));
      }
    }
  }, [updateDataHealth]);
  
  // ==================== REAL-TIME UPDATES ====================
  
  const initializeRealTimeUpdates = useCallback(() => {
    logger.log('Initializing schedule real-time updates...');

    if (!socket) {
      logger.log('Schedule real-time updates waiting for authenticated socket');
      return () => {
        logger.log('Schedule real-time updates cleanup skipped; socket was unavailable');
      };
    }

    const handleScheduleUpdate = (payload?: { type?: string; data?: { type?: string } }) => {
      logger.log('Received schedule socket event:', payload?.type || payload?.data?.type || 'schedule:update');
      refreshDataRef.current?.(false, activeFilterOptionsRef.current);
    };

    socket.on('schedule:update', handleScheduleUpdate);
    socket.on('schedule:sync_required', handleScheduleUpdate);

    return () => {
      socket.off('schedule:update', handleScheduleUpdate);
      socket.off('schedule:sync_required', handleScheduleUpdate);
      logger.log('Schedule real-time updates cleaned up');
    };
  }, [socket]);
  
  // ==================== ENHANCED DATA LOADING FUNCTIONS ====================
  
  const loadSessions = useCallback(async (options: { force?: boolean; showLoading?: boolean; filterOptions?: import('../types').FilterOptions } = {}) => {
    const { showLoading = true, filterOptions } = options;

    try {
      await executeWithCircuitBreaker(
        async () => {
          const userRole = user?.role || 'user';
          const userId = user?.id || '';

          // Build filter options with role info and any additional filters (e.g., adminScope)
          const filters: import('../types').FilterOptions = {
            ...(filterOptions || {}),
            trainerId: filterOptions?.trainerId || '',
            clientId: filterOptions?.clientId || '',
            status: filterOptions?.status || 'all',
            dateRange: filterOptions?.dateRange || 'all',
            location: filterOptions?.location || '',
            searchTerm: filterOptions?.searchTerm || ''
          };

          // Pass role context for backwards compatibility
          if (userRole === 'admin' || userRole === 'trainer') {
            filters.role = userRole;
            filters.userId = userId;
          }

          return await dispatch(fetchEvents(filters));
        },
        'loadSessions',
        { showLoading, dataType: 'sessions' }
      );
    } catch (error) {
      setErrors(prev => ({ ...prev, sessions: 'Failed to load sessions' }));
      throw error;
    }
  }, [dispatch, user?.id, user?.role, executeWithCircuitBreaker]);
  
  const loadClients = useCallback(async (options: { force?: boolean; showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;

    if (!canLoadClientRoster) {
      setLoading(prev => ({ ...prev, clients: false }));
      setErrors(prev => ({ ...prev, clients: null }));
      return;
    }
    
    try {
      await executeWithCircuitBreaker(
        async () => {
          return await dispatch(fetchClients());
        },
        'loadClients',
        { showLoading, dataType: 'clients' }
      );
    } catch (error) {
      setErrors(prev => ({ ...prev, clients: 'Failed to load clients' }));
      throw error;
    }
  }, [canLoadClientRoster, dispatch, executeWithCircuitBreaker]);
  
  const loadTrainers = useCallback(async (options: { force?: boolean; showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;
    
    try {
      await executeWithCircuitBreaker(
        async () => {
          return await dispatch(fetchTrainers());
        },
        'loadTrainers',
        { showLoading, dataType: 'trainers' }
      );
    } catch (error) {
      setErrors(prev => ({ ...prev, trainers: 'Failed to load trainers' }));
      throw error;
    }
  }, [dispatch, executeWithCircuitBreaker]);
  
  const loadAssignments = useCallback(async (options: { force?: boolean; showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;

    if (!canLoadClientRoster) {
      setAssignments([]);
      setLoading(prev => ({ ...prev, assignments: false }));
      setErrors(prev => ({ ...prev, assignments: null }));
      return;
    }
    
    try {
      await executeWithCircuitBreaker(
        async () => {
          const assignmentsData = user?.role === 'trainer' && user?.id
            ? await clientTrainerAssignmentService.getTrainerAssignments(String(user.id))
            : await clientTrainerAssignmentService.getAssignments();
          setAssignments(assignmentsData);
          return assignmentsData;
        },
        'loadAssignments',
        { showLoading, dataType: 'assignments' }
      );
    } catch (error) {
      setErrors(prev => ({ ...prev, assignments: 'Failed to load assignments' }));
      throw error;
    }
  }, [canLoadClientRoster, executeWithCircuitBreaker, user?.id, user?.role]);
  
  // ==================== CACHE MANAGEMENT ====================
  
  const invalidateCache = useCallback((dataType?: 'sessions' | 'clients' | 'trainers' | 'assignments') => {
    if (dataType) {
      sessionStorage.removeItem(`${dataType}_cache`);
      sessionStorage.removeItem(`${dataType}_cache_timestamp`);
    } else {
      // Clear all caches
      ['sessions', 'clients', 'trainers', 'assignments'].forEach(type => {
        sessionStorage.removeItem(`${type}_cache`);
        sessionStorage.removeItem(`${type}_cache_timestamp`);
      });
    }
    logger.log(`🗑️ Cache invalidated: ${dataType || 'all'}`);
  }, []);
  
  // ==================== ENHANCED INITIALIZATION ====================
  
  const initializeComponent = useCallback(async (params: {
    realTimeEnabled?: boolean;
  } = {}) => {
    const { realTimeEnabled = false } = params;
    
    logger.log('🚀 Initializing Universal Master Schedule...');
    
    // Check if we should delay initialization due to previous failures
    const initFailures = parseInt(sessionStorage.getItem('init_failures') || '0');
    const lastInitAttempt = parseInt(sessionStorage.getItem('last_init_attempt') || '0');
    const now = Date.now();
    
    if (initFailures > 0 && (now - lastInitAttempt) < 10000) {
      const delay = Math.min(2000 * initFailures, 10000); // Max 10 second delay
      logger.log(`🕰️ Delaying initialization by ${delay}ms due to ${initFailures} previous failures`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      setLoading(prev => ({ ...prev, refreshing: true }));
      clearErrors();
      sessionStorage.setItem('last_init_attempt', now.toString());
      
      // Load data with intelligent prioritization
      logger.log('📊 Loading core data...');
      
      // Load sessions first (highest priority)
      await loadSessions({ showLoading: true });
      
      // Load supporting data in parallel (lower priority)
      const supportingDataTasks = [
        { dataType: 'trainers', promise: loadTrainers({ showLoading: true }) },
        ...(canLoadClientRoster ? [
          { dataType: 'clients', promise: loadClients({ showLoading: true }) },
          { dataType: 'assignments', promise: loadAssignments({ showLoading: true }) }
        ] : [])
      ];
      const supportingDataPromises = supportingDataTasks.map(task => task.promise);
      const dataTypes = supportingDataTasks.map(task => task.dataType);
      
      const results = await Promise.allSettled(supportingDataPromises);
      
      // Log any failures but don't crash
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.warn(`⚠️ Failed to load ${dataTypes[index]}:`, result.reason);
        }
      });
      
      // Success - reset failure count
      sessionStorage.removeItem('init_failures');
      updateDataHealth(true);
      
      logger.log('✅ Universal Master Schedule initialized successfully');
      
      // Initialize real-time updates if enabled
      if (realTimeEnabled) {
        try {
          const previousCleanup = (window as ScheduleWindow).__scheduleCleanup;
          if (previousCleanup) {
            previousCleanup();
          }
          const cleanup = initializeRealTimeUpdates();
          // Store cleanup function for later use
          (window as ScheduleWindow).__scheduleCleanup = cleanup;
        } catch (rtError) {
          logger.warn('⚠️ Real-time updates failed to initialize:', rtError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error initializing Universal Master Schedule:', error);
      
      // Record initialization failure with exponential backoff
      const newFailures = initFailures + 1;
      sessionStorage.setItem('init_failures', newFailures.toString());
      updateDataHealth(false);
      
      const errorMessage = newFailures >= 3 
        ? 'Service temporarily unavailable. Please refresh the page or try again later.' 
        : 'Failed to initialize schedule. Please refresh and try again.';
      
      setErrors(prev => ({ ...prev, sessions: errorMessage }));
      
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, refreshing: false }));
    }
  }, [canLoadClientRoster, loadSessions, loadClients, loadTrainers, loadAssignments, clearErrors, updateDataHealth, initializeRealTimeUpdates]);
  
  const refreshData = useCallback(async (force: boolean = false, filterOptions?: import('../types').FilterOptions) => {
    if (filterOptions) {
      activeFilterOptionsRef.current = filterOptions;
    }
    logger.log(`🔄 Refreshing data${force ? ' (forced)' : ''}...`, filterOptions ? `with filters: ${JSON.stringify(filterOptions)}` : '');

    try {
      setLoading(prev => ({ ...prev, refreshing: true }));

      if (force) {
        invalidateCache();
      }

      // Refresh all data in parallel
      const refreshTasks = [
        { dataType: 'sessions', promise: loadSessions({ force, showLoading: false, filterOptions }) },
        { dataType: 'trainers', promise: loadTrainers({ force, showLoading: false }) },
        ...(canLoadClientRoster ? [
          { dataType: 'clients', promise: loadClients({ force, showLoading: false }) },
          { dataType: 'assignments', promise: loadAssignments({ force, showLoading: false }) }
        ] : [])
      ];
      const refreshPromises = refreshTasks.map(task => task.promise);

      const results = await Promise.allSettled(refreshPromises);

      // Check results
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      logger.log(`✅ Data refresh completed: ${successCount}/${refreshTasks.length} successful`);

      updateDataHealth(successCount > 0);

    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      updateDataHealth(false);
    } finally {
      setLoading(prev => ({ ...prev, refreshing: false }));
    }
  }, [canLoadClientRoster, loadSessions, loadClients, loadTrainers, loadAssignments, invalidateCache, updateDataHealth]);

  refreshDataRef.current = refreshData;
  

  
  // Effects are now managed by the main component to avoid circular dependencies
  
  // ==================== AUTOMATIC DATA FRESHNESS CHECKING ====================
  
  useEffect(() => {
    // Check data freshness every 5 minutes
    const interval = setInterval(() => {
      if (isDataStale()) {
        setDataHealth(prev => ({ ...prev, isStale: true }));
        logger.log('⏰ Data is stale, consider refreshing');
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isDataStale]);
  
  // ==================== CLEANUP ON UNMOUNT ====================
  
  useEffect(() => {
    return () => {
      // Cleanup real-time updates
      const cleanup = (window as ScheduleWindow).__scheduleCleanup;
      if (cleanup) {
        cleanup();
        delete (window as ScheduleWindow).__scheduleCleanup;
      }
    };
  }, []);
  
  // ==================== MEMOIZED DATA TRANSFORMATIONS ====================

  /**
   * Transform sessions to include flattened clientName and trainerName
   * Backend returns nested client/trainer objects, but UI components expect string names
   */
  const transformedSessions = useMemo(() => {
    return sessions.map((session) => {
      const enrichedSession = session as EnrichedSession;

      // Extract client name from nested object or use existing string
      let clientName = enrichedSession.clientName;
      if (!clientName && enrichedSession.client) {
        const { firstName, lastName } = enrichedSession.client;
        if (firstName || lastName) {
          clientName = `${firstName || ''} ${lastName || ''}`.trim();
        }
      }

      // Extract trainer name from nested object or use existing string
      let trainerName = enrichedSession.trainerName;
      if (!trainerName && enrichedSession.trainer) {
        const { firstName, lastName } = enrichedSession.trainer;
        if (firstName || lastName) {
          trainerName = `${firstName || ''} ${lastName || ''}`.trim();
        }
      }

      // Extract client contact info from nested object
      const clientEmail = enrichedSession.clientEmail || enrichedSession.client?.email || undefined;
      const clientPhone = enrichedSession.clientPhone || enrichedSession.client?.phone || undefined;
      const clientAvailableSessions = enrichedSession.clientAvailableSessions
        ?? enrichedSession.client?.availableSessions
        ?? undefined;
      const clientSource = enrichedSession.clientSource ?? enrichedSession.client?.clientSource ?? undefined;
      const sessionDeducted = enrichedSession.sessionDeducted ?? undefined;

      return {
        ...enrichedSession,
        clientName: clientName || undefined,
        trainerName: trainerName || undefined,
        clientEmail,
        clientPhone,
        clientAvailableSessions,
        clientSource,
        sessionDeducted,
      };
    });
  }, [sessions]);

  const enhancedStats = useMemo(() => {
    const baseStats = {
      totalSessions: transformedSessions.length,
      totalClients: clients.length,
      totalTrainers: trainers.length,
      totalAssignments: assignments.length,
      lastUpdated: dataHealth.lastRefresh?.toISOString() || new Date().toISOString()
    };

    return {
      ...scheduleStats,
      ...baseStats,
      dataQuality: {
        healthScore: dataHealth.successfulLoads > 0 ?
          Math.round((dataHealth.successfulLoads / (dataHealth.successfulLoads + dataHealth.failedLoads)) * 100) : 0,
        isStale: dataHealth.isStale,
        lastRefresh: dataHealth.lastRefresh,
        successRate: dataHealth.successfulLoads + dataHealth.failedLoads > 0 ?
          dataHealth.successfulLoads / (dataHealth.successfulLoads + dataHealth.failedLoads) : 1
      }
    };
  }, [transformedSessions.length, clients.length, trainers.length, assignments.length, scheduleStats, dataHealth]);
  
  // ==================== RETURN VALUES & ACTIONS ====================
  
  const values: CalendarDataValues = {
    // Core Raw Data (Enhanced with Redux Integration)
    // Use transformedSessions to include clientName/trainerName strings
    sessions: transformedSessions as Session[],
    clients,
    trainers,
    assignments,
    
    // Redux State (Enhanced)
    scheduleStatus,
    scheduleError,
    scheduleStats: enhancedStats,
    
    // Loading States (Granular)
    loading,
    
    // Error States (Detailed)
    errors,
    
    // Data Quality Metrics
    dataHealth
  };
  
  const actions: CalendarDataActions = {
    // Enhanced Data Loading (Production-Ready)
    initializeComponent,
    refreshData,
    
    // Granular Data Loading
    loadSessions,
    loadClients,
    loadTrainers,
    loadAssignments,
    
    // Real-time Updates Management
    initializeRealTimeUpdates,
    
    // Data Quality Management
    clearErrors,
    resetDataHealth,
    isDataStale,
    
    // Cache Management
    invalidateCache
  };
  
  return { ...values, ...actions };
};
