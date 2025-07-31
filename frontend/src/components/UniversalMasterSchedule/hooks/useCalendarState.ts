/**
 * useCalendarState - Core UI State Management Hook
 * ================================================
 * Manages all UI state for the Universal Master Schedule component
 * 
 * RESPONSIBILITIES:
 * - Loading states for all async operations
 * - Error states with detailed error messages
 * - Dialog visibility and management
 * - View preferences and display options
 * - Filter options and search criteria
 * - Mobile responsive state
 * - Analytics view state
 */

import { useState, useEffect } from 'react';
import type {
  LoadingState,
  ErrorState,
  DialogState,
  FilterOptions,
  CalendarView,
  SessionEvent
} from '../types';

export interface CalendarStateValues {
  // Core UI States
  loading: LoadingState;
  error: ErrorState;
  view: CalendarView;
  selectedDate: Date;
  selectedEvent: SessionEvent | null;
  
  // Dialog Management
  dialogs: DialogState;
  sessionFormMode: 'create' | 'edit' | 'duplicate';
  sessionFormInitialData: any;
  
  // Filter and Search
  filterOptions: FilterOptions;
  
  // Advanced Features
  realTimeEnabled: boolean;
  autoRefresh: boolean;
  compactView: boolean;
  showStatistics: boolean;
  highContrastMode: boolean;
  notificationsEnabled: boolean;
  
  // Analytics View
  analyticsView: 'calendar' | 'business' | 'trainers' | 'social' | 'allocations';
  dateRange: string;
  selectedTrainer: string | null;
  
  // Mobile State
  isMobile: boolean;
  mobileFiltersOpen: boolean;
  mobileActionsOpen: boolean;
}

export interface CalendarStateActions {
  // Loading State Management
  setLoading: (updates: Partial<LoadingState> | ((prev: LoadingState) => LoadingState)) => void;
  setError: (updates: Partial<ErrorState> | ((prev: ErrorState) => ErrorState)) => void;
  
  // View Management
  setView: (view: CalendarView) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedEvent: (event: SessionEvent | null) => void;
  
  // Dialog Management
  setDialogs: (updates: Partial<DialogState> | ((prev: DialogState) => DialogState)) => void;
  openDialog: (dialogName: keyof DialogState) => void;
  closeDialog: (dialogName: keyof DialogState) => void;
  closeAllDialogs: () => void;
  
  // Session Form Management
  setSessionFormMode: (mode: 'create' | 'edit' | 'duplicate') => void;
  setSessionFormInitialData: (data: any) => void;
  
  // Filter Management
  setFilterOptions: (updates: Partial<FilterOptions> | ((prev: FilterOptions) => FilterOptions)) => void;
  clearFilters: () => void;
  
  // Feature Toggles
  setRealTimeEnabled: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setCompactView: (enabled: boolean) => void;
  setShowStatistics: (enabled: boolean) => void;
  setHighContrastMode: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  
  // Analytics Management
  setAnalyticsView: (view: 'calendar' | 'business' | 'trainers' | 'social' | 'allocations') => void;
  setDateRange: (range: string) => void;
  setSelectedTrainer: (trainerId: string | null) => void;
  
  // Mobile State Management
  setIsMobile: (mobile: boolean) => void;
  setMobileFiltersOpen: (open: boolean) => void;
  setMobileActionsOpen: (open: boolean) => void;
}

const defaultLoadingState: LoadingState = {
  sessions: true,
  clients: false,
  trainers: false,
  assignments: false,
  statistics: false,
  bulkOperation: false
};

const defaultErrorState: ErrorState = {
  sessions: null,
  clients: null,
  trainers: null,
  assignments: null,
  statistics: null,
  bulkOperation: null
};

const defaultDialogState: DialogState = {
  eventDialog: false,
  assignmentDialog: false,
  statsDialog: false,
  filterDialog: false,
  bulkActionDialog: false,
  sessionFormDialog: false
};

const defaultFilterOptions: FilterOptions = {
  trainerId: '',
  clientId: '',
  status: 'all',
  dateRange: 'all',
  location: '',
  searchTerm: '',
  customDateStart: '',
  customDateEnd: ''
};

/**
 * useCalendarState Hook
 * 
 * Provides comprehensive state management for the Universal Master Schedule
 * with clean separation of concerns and type safety.
 */
export const useCalendarState = () => {
  // ==================== CORE UI STATE ====================
  
  const [loading, setLoadingState] = useState<LoadingState>(defaultLoadingState);
  const [error, setErrorState] = useState<ErrorState>(defaultErrorState);
  const [view, setView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  
  // ==================== DIALOG STATE ====================
  
  const [dialogs, setDialogsState] = useState<DialogState>(defaultDialogState);
  const [sessionFormMode, setSessionFormMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [sessionFormInitialData, setSessionFormInitialData] = useState<any>(null);
  
  // ==================== FILTER STATE ====================
  
  const [filterOptions, setFilterOptionsState] = useState<FilterOptions>(defaultFilterOptions);
  
  // ==================== ADVANCED FEATURES STATE ====================
  
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // ==================== ANALYTICS STATE ====================
  
  const [analyticsView, setAnalyticsView] = useState<'calendar' | 'business' | 'trainers' | 'social' | 'allocations'>('calendar');
  const [dateRange, setDateRange] = useState('month');
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  
  // ==================== MOBILE STATE ====================
  
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  
  // ==================== MOBILE DETECTION EFFECT ====================
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // ==================== ACTION CREATORS ====================
  
  const setLoading = (updates: Partial<LoadingState> | ((prev: LoadingState) => LoadingState)) => {
    if (typeof updates === 'function') {
      setLoadingState(updates);
    } else {
      setLoadingState(prev => ({ ...prev, ...updates }));
    }
  };
  
  const setError = (updates: Partial<ErrorState> | ((prev: ErrorState) => ErrorState)) => {
    if (typeof updates === 'function') {
      setErrorState(updates);
    } else {
      setErrorState(prev => ({ ...prev, ...updates }));
    }
  };
  
  const setDialogs = (updates: Partial<DialogState> | ((prev: DialogState) => DialogState)) => {
    if (typeof updates === 'function') {
      setDialogsState(updates);
    } else {
      setDialogsState(prev => ({ ...prev, ...updates }));
    }
  };
  
  const openDialog = (dialogName: keyof DialogState) => {
    setDialogsState(prev => ({ ...prev, [dialogName]: true }));
  };
  
  const closeDialog = (dialogName: keyof DialogState) => {
    setDialogsState(prev => ({ ...prev, [dialogName]: false }));
  };
  
  const closeAllDialogs = () => {
    setDialogsState(defaultDialogState);
  };
  
  const setFilterOptions = (updates: Partial<FilterOptions> | ((prev: FilterOptions) => FilterOptions)) => {
    if (typeof updates === 'function') {
      setFilterOptionsState(updates);
    } else {
      setFilterOptionsState(prev => ({ ...prev, ...updates }));
    }
  };
  
  const clearFilters = () => {
    setFilterOptionsState(defaultFilterOptions);
  };
  
  // ==================== RETURN VALUES & ACTIONS ====================
  
  const values: CalendarStateValues = {
    // Core UI States
    loading,
    error,
    view,
    selectedDate,
    selectedEvent,
    
    // Dialog Management
    dialogs,
    sessionFormMode,
    sessionFormInitialData,
    
    // Filter and Search
    filterOptions,
    
    // Advanced Features
    realTimeEnabled,
    autoRefresh,
    compactView,
    showStatistics,
    highContrastMode,
    notificationsEnabled,
    
    // Analytics View
    analyticsView,
    dateRange,
    selectedTrainer,
    
    // Mobile State
    isMobile,
    mobileFiltersOpen,
    mobileActionsOpen
  };
  
  const actions: CalendarStateActions = {
    // Loading State Management
    setLoading,
    setError,
    
    // View Management
    setView,
    setSelectedDate,
    setSelectedEvent,
    
    // Dialog Management
    setDialogs,
    openDialog,
    closeDialog,
    closeAllDialogs,
    
    // Session Form Management
    setSessionFormMode,
    setSessionFormInitialData,
    
    // Filter Management
    setFilterOptions,
    clearFilters,
    
    // Feature Toggles
    setRealTimeEnabled,
    setAutoRefresh,
    setCompactView,
    setShowStatistics,
    setHighContrastMode,
    setNotificationsEnabled,
    
    // Analytics Management
    setAnalyticsView,
    setDateRange,
    setSelectedTrainer,
    
    // Mobile State Management
    setIsMobile,
    setMobileFiltersOpen,
    setMobileActionsOpen
  };
  
  return { ...values, ...actions };
};

export default useCalendarState;
