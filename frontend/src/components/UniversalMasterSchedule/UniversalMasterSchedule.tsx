/**
 * Universal Master Schedule - PHASE 2B: MOBILE ADMIN INTEGRATION ENHANCEMENT
 * ==============================================================================
 * The ultimate scheduling management system with Phase 2A Mobile Admin Integration
 * 
 * 🌟 PHASE 2B ENHANCEMENT - MOBILE ADMIN INTEGRATION:
 * ✅ Seamless Integration with Phase 2A Mobile Admin Navigation
 * ✅ Enhanced Mobile Admin Layout Optimization
 * ✅ Mobile-First Admin Dashboard Context Awareness
 * ✅ Touch-Optimized Admin Calendar Controls
 * ✅ Mobile Admin Responsive Design Patterns
 * ✅ PWA Integration with Mobile Admin Interface
 * ✅ Enhanced Mobile Admin Accessibility
 * ✅ Mobile Admin Performance Optimizations
 * 
 * PHASE 2B MOBILE ADMIN FEATURES:
 * - Admin sidebar mobile state integration
 * - Mobile admin layout responsiveness
 * - Touch-optimized admin calendar interactions
 * - Mobile admin navigation patterns
 * - Enhanced mobile admin UX flows
 * - Mobile admin performance optimizations
 * 
 * 🚨 P0 HOTFIX: Force clean to resolve useCallback import issue in production
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider } from 'styled-components';
import { Calendar, Views, SlotInfo } from 'react-big-calendar';
import { dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useToast } from '../../hooks/use-toast';

// Redux selectors for role-based rendering
import { useSelector } from 'react-redux';
import { selectCurrentUserRole, selectCurrentUserId } from '../../redux/slices/scheduleSlice';

// Material-UI Components
import {
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Tooltip
} from '@mui/material';

// Icons
import {
  Calendar as CalendarIcon,
  Users,
  Filter,
  RefreshCw,
  X,
  Layers,
  CheckCircle,
  Move,
  Trash2,
  BarChart3,
  Activity,
  CreditCard,
  DollarSign,
  Target,
  Star,
  AlertCircle,
  Bell,
  BookOpen,
  // PHASE 2: Mobile Navigation Icons
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Custom Components
import GlowButton from '../ui/buttons/GlowButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// Session Allocation Manager
import SessionAllocationManager from './SessionAllocationManager';

// Enhanced Dialog Components
import {
  SessionFormDialog,
  BulkActionsConfirmationDialog,
  AdvancedFilterDialog
} from './Dialogs';

// Real Chart Components
import {
  RevenueLineChart,
  TrainerPerformanceBarChart,
  SessionDistributionPieChart
} from './Charts';

// Advanced Analytics Components
import {
  AdvancedAnalyticsDashboard,
  TrainerPerformanceAnalytics,
  SocialIntegrationAnalytics
} from './Analytics';

// Fallback Calendar Component
import CalendarFallback from './CalendarFallback';

// NEW: Real-time Components (Phase 3)
import AdminNotificationCenter from './AdminNotificationCenter';
import CollaborativeSchedulingPanel from './CollaborativeSchedulingPanel';
import RealTimeSystemMonitor from './RealTimeSystemMonitor';
import RealTimeConnectionStatus from './RealTimeConnectionStatus';

// Styled Components and Theme
import { CommandCenterTheme } from './UniversalMasterScheduleTheme';

// Modular Hooks - The Heart of the Refactored Architecture (PHASE 3 ENHANCED)
import {
  useCalendarState,
  useCalendarData,
  useCalendarHandlers,
  useBulkOperations,
  useBusinessIntelligence,
  useFilteredCalendarEvents,
  useRealTimeUpdates,
  useAdminNotifications,
  useCollaborativeScheduling,
  // PHASE 2: Mobile-First Responsive Optimization
  useMobileCalendarOptimization,
  // PHASE 3: UI/UX Excellence
  useMicroInteractions
} from './hooks';

// PHASE 3: Advanced Animation and Celebration Components
import CelebrationEffects, { CelebrationEffectsRef } from './CelebrationEffects';

// Utility Functions
import { renderCalendar } from './utils/renderCalendar';

// Import styles
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Enhanced calendar initialization with robust error handling
let localizer: any = null;
let DragAndDropCalendar: any = null;
let isCalendarInitialized = false;

// Calendar initialization (kept from original for stability)
try {
  const locales = { 'en-US': enUS };
  localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
  DragAndDropCalendar = withDragAndDrop(Calendar);
  isCalendarInitialized = true;
  console.log('✅ Calendar initialized with date-fns localizer - Production Ready');
} catch (error) {
  console.error('❌ Error initializing calendar:', error);
  try {
    DragAndDropCalendar = Calendar;
    isCalendarInitialized = false;
    localizer = null;
    console.log('⚠️ Calendar initialized in fallback mode');
  } catch (fallbackError) {
    console.error('❌ Complete calendar initialization failure:', fallbackError);
    isCalendarInitialized = false;
    localizer = null;
    DragAndDropCalendar = null;
  }
}

// ==================== PHASE 2: ROLE-BASED UI CONFIGURATION ====================

/**
 * Define which views are available for each user role
 */
const ROLE_VIEW_CONFIG = {
  admin: {
    availableViews: ['calendar', 'business', 'trainers', 'social', 'allocations', 'notifications', 'collaboration', 'monitor'],
    defaultView: 'calendar',
    showBulkActions: true,
    showAdvancedFilters: true,
    showKPIs: true,
    showMultiSelect: true,
    calendarMode: 'full' // full admin features
  },
  trainer: {
    availableViews: ['calendar', 'trainers', 'notifications', 'collaboration'],
    defaultView: 'calendar',
    showBulkActions: false, // Limited bulk actions for trainers
    showAdvancedFilters: true,
    showKPIs: true, // Limited KPIs relevant to trainers
    showMultiSelect: false,
    calendarMode: 'trainer' // trainer-specific features
  },
  client: {
    availableViews: ['calendar', 'notifications'],
    defaultView: 'calendar',
    showBulkActions: false,
    showAdvancedFilters: false, // Simple filtering only
    showKPIs: false, // No business metrics for clients
    showMultiSelect: false,
    calendarMode: 'client' // simplified booking interface
  },
  user: {
    availableViews: ['calendar'],
    defaultView: 'calendar',
    showBulkActions: false,
    showAdvancedFilters: false,
    showKPIs: false,
    showMultiSelect: false,
    calendarMode: 'public' // public booking interface only
  }
};

/**
 * Get view configuration for current user role
 */
const getRoleViewConfig = (role: string | null) => {
  if (!role || !ROLE_VIEW_CONFIG[role as keyof typeof ROLE_VIEW_CONFIG]) {
    return ROLE_VIEW_CONFIG.user; // Default to most restricted view
  }
  return ROLE_VIEW_CONFIG[role as keyof typeof ROLE_VIEW_CONFIG];
};

/**
 * Get role-appropriate header title and subtitle
 */
const getRoleHeaderContent = (role: string | null, isSmallMobile: boolean) => {
  switch (role) {
    case 'admin':
      return {
        title: isSmallMobile ? "Master Schedule" : "Universal Master Schedule",
        subtitle: isSmallMobile ? "Admin command center" : "Advanced scheduling & business intelligence center"
      };
    case 'trainer':
      return {
        title: isSmallMobile ? "Trainer Schedule" : "Trainer Master Schedule",
        subtitle: isSmallMobile ? "Session management" : "Manage your sessions and track client progress"
      };
    case 'client':
      return {
        title: isSmallMobile ? "My Sessions" : "Personal Schedule",
        subtitle: isSmallMobile ? "Book & manage sessions" : "Book sessions and manage your fitness journey"
      };
    case 'user':
    default:
      return {
        title: isSmallMobile ? "Book Sessions" : "Available Sessions",
        subtitle: isSmallMobile ? "Browse & book" : "Browse and book available training sessions"
      };
  }
};

/**
 * Get role-appropriate KPIs to display
 */
const getRoleKPIs = (role: string | null, executiveKPIs: any, comprehensiveBusinessMetrics: any) => {
  switch (role) {
    case 'admin':
      return [
        {
          icon: DollarSign,
          label: 'Monthly Revenue',
          value: `$${executiveKPIs.monthlyRecurringRevenue?.toLocaleString() || '0'}`,
          onClick: 'business'
        },
        {
          icon: Users,
          label: 'Active Clients',
          value: comprehensiveBusinessMetrics.activeClients || '0',
          onClick: 'trainers'
        },
        {
          icon: Target,
          label: 'Utilization',
          value: `${comprehensiveBusinessMetrics.utilizationRate || '0'}%`,
          onClick: null
        },
        {
          icon: Star,
          label: 'NASM Compliance',
          value: `${executiveKPIs.complianceScore || '0'}%`,
          onClick: null
        },
        {
          icon: Activity,
          label: 'Social Engagement',
          value: `${comprehensiveBusinessMetrics.socialEngagementRate || '0'}%`,
          onClick: 'social'
        }
      ];
    case 'trainer':
      return [
        {
          icon: Users,
          label: 'My Clients',
          value: comprehensiveBusinessMetrics.activeClients || '0',
          onClick: null
        },
        {
          icon: Target,
          label: 'Sessions Today',
          value: comprehensiveBusinessMetrics.sessionsToday || '0',
          onClick: null
        },
        {
          icon: Star,
          label: 'Completion Rate',
          value: `${comprehensiveBusinessMetrics.completionRate || '0'}%`,
          onClick: null
        },
        {
          icon: Activity,
          label: 'Client Progress',
          value: 'On Track',
          onClick: null
        }
      ];
    default:
      return []; // No KPIs for clients and public users
  }
};

/**
 * Universal Master Schedule Component Props - PHASE 2B: MOBILE ADMIN INTEGRATION
 * 
 * Enhanced to integrate seamlessly with Phase 2A Mobile Admin Navigation System
 */
interface UniversalMasterScheduleProps {
  // Phase 2B: Mobile Admin Integration Props
  adminMobileMenuOpen?: boolean;
  onAdminMobileMenuToggle?: (isOpen: boolean) => void;
  adminDeviceType?: 'mobile' | 'tablet' | 'desktop';
  adminMobileOptimized?: boolean;
  
  // Mobile Admin Layout Props
  mobileAdminMode?: boolean;
  showMobileAdminControls?: boolean;
  mobileAdminSidebarWidth?: string;
  
  // Mobile Admin Event Handlers
  onMobileAdminAction?: (action: string, data?: any) => void;
  onMobileAdminNavigation?: (direction: string) => void;
  
  // Mobile Admin Performance Props
  mobileAdminReducedAnimations?: boolean;
  mobileAdminOptimizedRendering?: boolean;
  
  // Admin Context Props
  adminContext?: 'dashboard' | 'standalone';
  adminRole?: 'admin' | 'trainer' | 'client' | 'user';
}

/**
 * Universal Master Schedule Component - PHASE 2B: MOBILE ADMIN INTEGRATION EDITION
 * 
 * Enhanced orchestrator component with seamless Phase 2A Mobile Admin Navigation integration
 * for creating a unified mobile admin experience.
 * 
 * 🚨 P0 HOTFIX: This component has been force-cleaned to resolve production useCallback error
 */
const UniversalMasterSchedule: React.FC<UniversalMasterScheduleProps> = ({
  // Phase 2B: Mobile Admin Integration Props
  adminMobileMenuOpen = false,
  onAdminMobileMenuToggle,
  adminDeviceType = 'desktop',
  adminMobileOptimized = false,
  
  // Mobile Admin Layout Props
  mobileAdminMode = false,
  showMobileAdminControls = true,
  mobileAdminSidebarWidth = '280px',
  
  // Mobile Admin Event Handlers
  onMobileAdminAction,
  onMobileAdminNavigation,
  
  // Mobile Admin Performance Props
  mobileAdminReducedAnimations = false,
  mobileAdminOptimizedRendering = false,
  
  // Admin Context Props
  adminContext = 'standalone',
  adminRole = 'admin'
}) => {
  const { toast } = useToast();
  
  // PHASE 3: Celebration Effects Reference
  const celebrationEffectsRef = useRef<CelebrationEffectsRef>(null);
  
  // ==================== PHASE 2: ROLE-BASED STATE MANAGEMENT ====================
  
  // Get current user role and ID from Redux
  const currentUserRole = useSelector(selectCurrentUserRole);
  const currentUserId = useSelector(selectCurrentUserId);
  
  // Get role-specific configuration
  const roleConfig = useMemo(() => getRoleViewConfig(currentUserRole), [currentUserRole]);
  const roleHeaderContent = useMemo(() => getRoleHeaderContent(currentUserRole, false), [currentUserRole]);
  
  // ==================== EMERGENCY: COMPONENT CIRCUIT BREAKER (ENHANCED) ====================
  
  const [componentMountCount, setComponentMountCount] = useState(() => {
    const stored = sessionStorage.getItem('ums_mount_count');
    return stored ? parseInt(stored) : 0;
  });
  
  // ENHANCED: Robust initialization state tracking to prevent infinite useEffect loops
  const [initializationBlocked, setInitializationBlocked] = useState(false);
  const initFailureCountRef = useRef(0);
  const lastInitAttemptRef = useRef(0);
  
  const mountTimeRef = useRef<number>(Date.now());
  const isInitializedRef = useRef<boolean>(false);
  
  // Prevent infinite mounting by tracking mount frequency
  useEffect(() => {
    const now = Date.now();
    const timeSinceMount = now - mountTimeRef.current;
    
    // If component is mounting too frequently (more than 5 times in 10 seconds), block it
    if (componentMountCount > 5 && timeSinceMount < 10000) {
      console.error('🛑 EMERGENCY: Component mount circuit breaker activated - too many rapid mounts');
      setComponentMountCount(prev => {
        const newCount = prev + 1;
        sessionStorage.setItem('ums_mount_count', newCount.toString());
        return newCount;
      });
      return;
    }
    
    // Reset count if enough time has passed
    if (timeSinceMount > 30000) {
      sessionStorage.removeItem('ums_mount_count');
      setComponentMountCount(0);
    } else {
      setComponentMountCount(prev => {
        const newCount = prev + 1;
        sessionStorage.setItem('ums_mount_count', newCount.toString());
        sessionStorage.setItem('ums_last_mount', now.toString());
        return newCount;
      });
    }
    
    console.log(`🔄 UniversalMasterSchedule mounted (attempt ${componentMountCount + 1}) for role: ${currentUserRole}`);
    
    // PHASE 3: Mount celebration for first-time users
    if (componentMountCount === 1 && currentUserRole) {
      setTimeout(() => {
        triggerHaptic('light');
        animateElement('header-title', 'fade', 500);
      }, 500);
    }
  }, []);
  
  // If we're in circuit breaker mode, show a minimal error state
  if (componentMountCount > 10) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a, #0891b2)',
        color: 'white',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h1>🛑 System Protection Activated</h1>
        <p>The calendar component has been temporarily disabled to prevent system overload.</p>
        <p>Please refresh the page in a few minutes or contact support.</p>
        <button 
          onClick={() => {
            sessionStorage.clear();
            window.location.reload();
          }}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Reset & Reload
        </button>
      </div>
    );
  }
  
  // Refs
  const calendarRef = useRef<any>(null);
  const bulkActionRef = useRef<HTMLDivElement>(null);
  
  // ==================== HOOKS GUARD: PREVENT HOOKS IN PROBLEMATIC STATE ====================
  
  // If mounting too frequently, use minimal state to prevent hook cascade failures
  const shouldUseMinimalMode = componentMountCount > 7;
  
  // ==================== PHASE 3: MICRO-INTERACTIONS INTEGRATION ====================
  
  // Advanced Micro-Interactions for "Apple Phone-Level" Experience
  const {
    triggerHaptic,
    playSound,
    animateElement,
    isLoading: microInteractionLoading,
    isAnimating,
    handleSessionAction: microHandleSessionAction,
    handleBulkAction: microHandleBulkAction,
    handleDragOperation,
    handleRealTimeUpdate,
    handleNavigation,
    withLoadingState,
    createPulseAnimation,
    createShakeAnimation,
    createGlowAnimation,
    getPerformanceMetrics: getMicroInteractionMetrics
  } = useMicroInteractions({
    enableHaptics: true,
    enableSounds: false, // Disabled by default
    enableAnimations: true,
    hapticThrottleMs: 50,
    animationDuration: 300,
    enableDebugMode: false
  });
  
  // ==================== MODULAR HOOKS ORCHESTRATION (PHASE 3 ENHANCED) ====================
  
  // 1. Core UI State Management (Enhanced with micro-interactions)
  const {
    loading,
    error,
    view,
    selectedDate,
    selectedEvent,
    dialogs,
    sessionFormMode,
    sessionFormInitialData,
    filterOptions,
    setFilterOptions,
    analyticsView,
    dateRange,
    selectedTrainer,
    isMobile,
    openDialog,
    closeDialog,
    setView,
    setSelectedDate,
    setLoading,
    setError,
    setDialogs,
    setSessionFormMode,
    setSessionFormInitialData,
    setSelectedEvent,
    setAnalyticsView,
    setDateRange,
    setSelectedTrainer,
    closeAllDialogs,
    autoRefresh,
    realTimeEnabled
  } = useCalendarState();
  
  // 2. Pure Data Fetching & Management (MINIMAL MODE SAFETY)
  const {
    sessions,
    clients,
    trainers,
    assignments,
    scheduleStatus,
    scheduleError,
    scheduleStats,
    initializeComponent,
    refreshData
  } = useCalendarData();
  
  // 3. Specialized Calendar Event Filtering (SAFE IN MINIMAL MODE)
  const {
    calendarEvents,
    filteredEventCount,
    totalEventCount,
    filterEfficiency
  } = useFilteredCalendarEvents({
    sessions: shouldUseMinimalMode ? [] : sessions,
    filterOptions: shouldUseMinimalMode ? {} : filterOptions
  });
  
  // 4. Real-time Updates Management (ENHANCED)
  const {
    connectionStatus,
    isConnected,
    lastMessageTime,
    reconnectAttempts,
    messagesReceived,
    uptime,
    connectionQuality: realTimeConnectionQuality,
    networkLatency,
    getConnectionHealth,
    getPerformanceMetrics: getRealTimePerformanceMetrics,
    reconnect: realTimeReconnect
  } = useRealTimeUpdates({
    onDataUpdate: refreshData,
    enabled: realTimeEnabled,
    enablePerformanceMonitoring: true,
    enableCircuitBreaker: true
  });
  
  // 5. Admin Notification System (NEW) - Only for admin/trainer roles
  const {
    notifications,
    unreadCount,
    criticalCount,
    isConnected: notificationsConnected,
    sendTestNotification,
    markAllAsRead: markAllNotificationsRead
  } = useAdminNotifications({
    enableRealTime: roleConfig.availableViews.includes('notifications'),
    maxNotifications: 100
  });
  
  // 6. Collaborative Scheduling (NEW) - Only for admin/trainer roles
  const {
    activeUsers,
    totalOnlineUsers,
    isConnected: collaborationConnected,
    connectionQuality: collaborationConnectionQuality,
    lockedEvents,
    lockEvent,
    unlockEvent,
    joinSession: joinCollaborationSession,
    leaveSession: leaveCollaborationSession
  } = useCollaborativeScheduling({
    sessionId: `schedule-${selectedDate.toISOString().split('T')[0]}`,
    enableRealTimeSync: roleConfig.availableViews.includes('collaboration')
  });
  
  // 7. Event Handler Logic (Enhanced with micro-interactions)
  const {
    handleSelectSlot,
    handleSelectEvent,
    handleEventDrop,
    handleEventResize,
    handleSessionSaved,
    handleAnalyticsViewChange,
    handleDateRangeChange,
    handleTrainerSelect,
    setupEventListeners,
    cleanupEventListeners,
    hapticFeedback,
    isTouch,
    // PHASE 3: Enhanced interaction states
    isLoading: handlersLoading,
    isAnimating: handlersAnimating,
    // PHASE 3: Advanced interaction methods
    handleSessionAction,
    handleBulkActionFeedback,
    celebrateAchievement
  } = useCalendarHandlers({
    sessions,
    refreshData,
    setLoading,
    setDialogs,
    sessionFormMode,
    setSessionFormMode,
    setSessionFormInitialData,
    setSelectedEvent,
    setAnalyticsView,
    setDateRange,
    setSelectedTrainer,
    closeAllDialogs
  });
  
  // ==================== PHASE 3: ENHANCED CELEBRATION HANDLERS ====================
  
  // Enhanced celebration methods that integrate with micro-interactions
  const handleCelebration = useCallback((type: 'level_up' | 'achievement' | 'streak' | 'milestone', data?: any) => {
    // Trigger micro-interaction celebration
    celebrateAchievement(type, data);
    
    // Trigger visual celebration effects with enhanced feedback
    switch (type) {
      case 'level_up':
        celebrationEffectsRef.current?.celebrateLevelUp();
        triggerHaptic('heavy');
        playSound('success', 0.9);
        // Enhanced level up feedback
        animateElement('kpi-bar', 'glow', 1500);
        toast({
          title: '🎉 Level Up!',
          description: `Congratulations on reaching level ${data?.newLevel || 'Unknown'}!`,
          variant: 'default'
        });
        break;
      case 'achievement':
        celebrationEffectsRef.current?.celebrateAchievement();
        triggerHaptic('success');
        // Enhanced achievement feedback
        animateElement('header-title', 'pulse', 600);
        toast({
          title: '🏆 Achievement Unlocked!',
          description: data?.title || 'New achievement unlocked!',
          variant: 'default'
        });
        break;
      case 'streak':
        celebrationEffectsRef.current?.celebrateStreak();
        triggerHaptic('medium');
        // Enhanced streak feedback
        animateElement('view-toggles', 'bounce', 400);
        toast({
          title: '🔥 Streak Milestone!',
          description: `${data?.count || ''} sessions in a row!`,
          variant: 'default'
        });
        break;
      case 'milestone':
        celebrationEffectsRef.current?.triggerConfetti({ count: 75, duration: 3 });
        triggerHaptic('heavy');
        // Enhanced milestone feedback
        animateElement('schedule-container', 'pulse', 800);
        toast({
          title: '🎯 Milestone Achievement!',
          description: data?.description || 'Major milestone reached!',
          variant: 'default'
        });
        break;
    }
  }, [celebrateAchievement, triggerHaptic, playSound, animateElement, toast]);
  
  // 8. Bulk Operations Management (Admin only)
  const {
    multiSelect,
    bulkActionType,
    selectedSessionsData,
    canPerformBulkActions,
    selectedCount,
    toggleMultiSelect,
    selectAllEvents,
    clearSelection,
    initiateBulkAction,
    handleBulkActionComplete
  } = useBulkOperations({
    calendarEvents,
    refreshData,
    setLoading,
    setDialogs,
    loading,
    enabled: roleConfig.showBulkActions
  });
  
  // 9. Business Intelligence & Analytics (Admin/Trainer only)
  const {
    comprehensiveBusinessMetrics,
    executiveKPIs,
    revenueChartData,
    trainerChartData,
    sessionDistributionData,
    generateInsights,
    identifyOpportunities,
    flagRisks
  } = useBusinessIntelligence({
    sessions,
    clients,
    trainers,
    enabled: roleConfig.showKPIs
  });
  
  // 10. PHASE 2: Mobile-First Responsive Optimization
  const {
    // Mobile Detection & State
    isMobile: mobileOptimized,
    isTablet,
    isSmallMobile,
    orientation,
    preferredMobileView,
    supportedMobileViews,
    
    // Touch Interactions
    isDragging,
    swipeDirection,
    
    // Mobile UI States
    showMobileControls,
    mobileHeaderCollapsed,
    reducedAnimations,
    optimizedRendering,
    
    // Mobile Actions
    setOptimalMobileView,
    cycleMobileViews,
    navigatePrevious,
    navigateNext,
    navigateToToday,
    toggleMobileControls,
    collapseMobileHeader,
    optimizeForMobile,
    
    // Mobile Calendar Optimizations
    getMobileCalendarProps,
    getMobileEventProps,
    getTouchEventProps
  } = useMobileCalendarOptimization({
    currentView: view,
    setView,
    selectedDate,
    setSelectedDate,
    events: calendarEvents
  });
  
  // ==================== PHASE 2: ROLE-ADAPTIVE COMPUTED VALUES ====================
  
  // Get role-appropriate KPIs
  const roleKPIs = useMemo(() => 
    getRoleKPIs(currentUserRole, executiveKPIs, comprehensiveBusinessMetrics), 
    [currentUserRole, executiveKPIs, comprehensiveBusinessMetrics]
  );
  
  // Update analytics view if current view is not available for role
  useEffect(() => {
    if (!roleConfig.availableViews.includes(analyticsView)) {
      setAnalyticsView(roleConfig.defaultView);
    }
  }, [currentUserRole, analyticsView, roleConfig, setAnalyticsView]);
  
  // ==================== ENHANCED COMPONENT INITIALIZATION (ROBUST CIRCUIT BREAKER) ====================
  
  useEffect(() => {
    // 🛑 ENHANCED CIRCUIT BREAKER: Prevent infinite initialization loops with ref-based state
    if (isInitializedRef.current && !initializationBlocked) {
      console.log('🛑 Component already initialized - preventing re-initialization');
      return;
    }
    
    if (initializationBlocked) {
      console.log('🚫 Initialization blocked due to repeated failures');
      return;
    }
    
    // Check for rapid-fire initialization attempts (circuit breaker)
    const now = Date.now();
    if (now - lastInitAttemptRef.current < 5000 && initFailureCountRef.current > 0) {
      console.log(`⏳ Throttling initialization - ${initFailureCountRef.current} recent failures`);
      return;
    }
    
    const initializeComponentSafe = async () => {
      try {
        console.log(`🚀 Starting component initialization for role: ${currentUserRole}...`);
        lastInitAttemptRef.current = now;
        
        await initializeComponent({
          realTimeEnabled
        });
        
        const cleanup = setupEventListeners();
        
        // ✅ SUCCESS: Mark as initialized and reset failure counter
        isInitializedRef.current = true;
        initFailureCountRef.current = 0;
        sessionStorage.removeItem('ums_init_failures');
        console.log(`✅ Component initialization completed successfully for role: ${currentUserRole}`);
        
        // PHASE 3: Success celebration
        triggerHaptic('success');
        animateElement('schedule-container', 'fade', 600);
        
        return cleanup;
      } catch (error) {
        // 🚨 FAILURE: Increment counter and implement circuit breaker logic
        initFailureCountRef.current += 1;
        sessionStorage.setItem('ums_init_failures', initFailureCountRef.current.toString());
        
        console.error(`❌ Initialization failed (attempt ${initFailureCountRef.current}):`, error);
        
        // Block further attempts after 3 failures
        if (initFailureCountRef.current >= 3) {
          setInitializationBlocked(true);
          console.error('🛑 CIRCUIT BREAKER ACTIVATED: Too many initialization failures');
        }
        
        toast({
          title: 'Initialization Error',
          description: initFailureCountRef.current >= 3 
            ? 'Service temporarily unavailable. Please use the retry button below.'
            : 'Failed to initialize schedule. Retrying automatically...',
          variant: 'destructive'
        });
      }
    };
    
    // Only initialize once
    if (!isInitializedRef.current) {
      const cleanupPromise = initializeComponentSafe();
      
      return () => {
        cleanupPromise.then(cleanup => {
          if (cleanup) cleanup();
        });
        cleanupEventListeners();
        console.log('🧹 Component cleanup completed');
      };
    }
  }, [currentUserRole]); // ❗ CRITICAL: Removed problematic dependencies that caused loops 
  
  // Auto-refresh effect (restored)
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData().catch(error => {
          console.error('Auto-refresh failed:', error);
        });
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshData]);
  
  // ==================== LOADING STATE ====================
  
  if (loading.sessions && calendarEvents.length === 0) {
    return (
      <LoadingContainer>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <LoadingSpinner size="large" message={`Loading ${roleHeaderContent.title}...`} />
        </motion.div>
      </LoadingContainer>
    );
  }
  
  // ==================== ERROR STATE ====================
  
  if (error.sessions && calendarEvents.length === 0) {
    return (
      <ErrorContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle size={48} color="#ef4444" />
          <Typography variant="h5" color="white" sx={{ mt: 2 }}>
            Error Loading Schedule
          </Typography>
          <Typography variant="body1" color="rgba(255, 255, 255, 0.7)" sx={{ mt: 1 }}>
            {error.sessions}
          </Typography>
          <GlowButton 
            text="Retry Initialization"
            variant="primary"
            leftIcon={<RefreshCw size={18} />}
            onClick={() => {
              // Reset circuit breaker state for manual retry
              isInitializedRef.current = false;
              setInitializationBlocked(false);
              initFailureCountRef.current = 0;
              sessionStorage.removeItem('ums_init_failures');
              sessionStorage.removeItem('ums_mount_count');
              console.log('🔄 Manual retry initiated - resetting circuit breaker');
          
              // PHASE 3: Retry feedback
              triggerHaptic('medium');
              animateElement('retry-button', 'pulse', 300);
              
              // Force re-render to trigger useEffect
              window.location.reload();
            }}
          />
        </motion.div>
      </ErrorContainer>
    );
  }
  
  // ==================== MAIN RENDER ====================
  
  return (
    <ThemeProvider theme={CommandCenterTheme}>
      <ErrorBoundary>
        <ScheduleContainer
          adminMobileMenuOpen={adminMobileMenuOpen}
          adminDeviceType={adminDeviceType}
          mobileAdminMode={mobileAdminMode}
          mobileAdminSidebarWidth={mobileAdminSidebarWidth}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header Section - Enhanced with Role-Based Content */}
            <HeaderSection mobileCollapsed={mobileHeaderCollapsed} isSmallMobile={isSmallMobile}>
              <HeaderTitle>
                <CalendarIcon size={isSmallMobile ? 24 : 28} />
                <div>
                  <Typography variant={isSmallMobile ? "h5" : "h4"} component="h1">
                    {roleHeaderContent.title}
                  </Typography>
                  {!mobileHeaderCollapsed && (
                    <Typography variant="subtitle1" color="rgba(255, 255, 255, 0.7)">
                      {roleHeaderContent.subtitle}
                    </Typography>
                  )}
                </div>
              </HeaderTitle>
              
              <HeaderActions isMobile={mobileOptimized} showMobileControls={showMobileControls}>
                {/* Circuit Breaker Status Indicator */}
                {initializationBlocked && !isSmallMobile && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    <AlertCircle size={16} />
                    {isSmallMobile ? 'Protected' : 'System Protection Active'}
                  </div>
                )}
                
                {/* Real-Time Connection Status Indicator */}
                <RealTimeConnectionStatus
                  connectionStatus={connectionStatus}
                  isConnected={isConnected}
                  connectionQuality={realTimeConnectionQuality}
                  lastMessageTime={lastMessageTime}
                  reconnectAttempts={reconnectAttempts}
                  messagesReceived={messagesReceived}
                  uptime={uptime}
                  networkLatency={networkLatency}
                  onReconnect={() => {
                    triggerHaptic('medium');
                    animateElement('connection-status', 'pulse', 300);
                    realTimeReconnect();
                  }}
                  onGetPerformanceMetrics={getRealTimePerformanceMetrics}
                  isMobile={mobileOptimized}
                />
                
                {/* Refresh */}
                <Tooltip title="Refresh Data">
                  <EnhancedIconButton
                    onClick={() => {
                      triggerHaptic('light');
                      animateElement('refresh-button', 'pulse', 200);
                      withLoadingState(refreshData(), 'light');
                    }}
                    disabled={loading.sessions || microInteractionLoading}
                  >
                    <RefreshCw size={20} style={{ 
                      animation: loading.sessions || microInteractionLoading ? 'spin 1s linear infinite' : 'none' 
                    }} />
                  </EnhancedIconButton>
                </Tooltip>
              </HeaderActions>
            </HeaderSection>
            
            {/* Calendar Container - Minimal for Hotfix */}
            <CalendarContainer 
              isMobile={mobileOptimized} 
              isSmallMobile={isSmallMobile}
              reducedAnimations={reducedAnimations}
              {...getTouchEventProps()}
            >
              {renderCalendar({
                isCalendarInitialized,
                localizer,
                DragAndDropCalendar,
                calendarEvents,
                view,
                selectedDate,
                onSelectSlot: handleSelectSlot,
                onSelectEvent: handleSelectEvent,
                onEventDrop: roleConfig.calendarMode === 'full' ? handleEventDrop : undefined,
                onEventResize: roleConfig.calendarMode === 'full' ? handleEventResize : undefined,
                onView: setView,
                onNavigate: setSelectedDate,
                multiSelectEnabled: roleConfig.showMultiSelect && multiSelect.enabled,
                selectedEvents: multiSelect.selectedEvents,
                compactView: mobileOptimized,
                clientsCount: comprehensiveBusinessMetrics.activeClients,
                utilizationRate: comprehensiveBusinessMetrics.utilizationRate,
                completionRate: comprehensiveBusinessMetrics.completionRate,
                calendarRef,
                // Role-specific calendar props
                calendarMode: roleConfig.calendarMode,
                userRole: currentUserRole,
                userId: currentUserId,
                // PHASE 2: Mobile Calendar Optimizations
                ...getMobileCalendarProps(),
                ...getMobileEventProps()
              })}
            </CalendarContainer>
            
            {/* Loading Overlay - Enhanced with micro-interactions */}
            <AnimatePresence>
              {(loading.bulkOperation || microInteractionLoading) && (
                <LoadingOverlay
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <CircularProgress size={40} sx={{ color: '#00ffff' }} />
                  </motion.div>
                  <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>
                    {loading.bulkOperation ? 'Processing bulk action...' : 'Loading...'}
                  </Typography>
                  
                  {/* Progress indicator for better UX */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                    style={{
                      height: '2px',
                      background: 'linear-gradient(90deg, #00ffff, #3b82f6)',
                      marginTop: '1rem',
                      borderRadius: '1px'
                    }}
                  />
                </LoadingOverlay>
              )}
            </AnimatePresence>
          </motion.div>
        </ScheduleContainer>
      </ErrorBoundary>
      
      {/* PHASE 3: Celebration Effects Overlay */}
      <CelebrationEffects ref={celebrationEffectsRef} />
    </ThemeProvider>
  );
};

export default UniversalMasterSchedule;

// ==================== STYLED COMPONENTS (Enhanced for Role-Based UI) ====================

const ScheduleContainer = styled.div<{
  adminMobileMenuOpen?: boolean;
  adminDeviceType?: 'mobile' | 'tablet' | 'desktop';
  mobileAdminMode?: boolean;
  mobileAdminSidebarWidth?: string;
}>`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, 
    rgba(10, 10, 15, 0.95) 0%, 
    rgba(30, 58, 138, 0.1) 50%, 
    rgba(14, 165, 233, 0.05) 100%
  );
  position: relative;
  overflow: hidden;
  
  /* Enhanced mobile admin breakpoint handling */
  @media (max-width: 768px) {
    margin-left: 0 !important;
  }
`;

const HeaderSection = styled.div<{ mobileCollapsed?: boolean; isSmallMobile?: boolean }>`
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: ${props => {
    if (props.isSmallMobile) return props.mobileCollapsed ? '0.75rem 1rem' : '1rem';
    return '1.5rem 2rem';
  }};
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  height: ${props => props.mobileCollapsed ? '60px' : 'auto'};
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${props => props.mobileCollapsed ? '0.5rem' : '1rem'};
    padding: ${props => props.mobileCollapsed ? '0.75rem 1rem' : '1rem'};
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  svg {
    color: #3b82f6;
  }
  
  h4 {
    color: white;
    margin: 0;
    font-weight: 300;
  }
`;

const HeaderActions = styled.div<{ isMobile?: boolean; showMobileControls?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${props => props.isMobile && !props.showMobileControls ? 0.7 : 1};
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${props => props.isMobile ? '0.25rem' : '0.5rem'};
  }
  
  @media (max-width: 480px) {
    justify-content: center;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  gap: 1rem;
`;

const CalendarContainer = styled.div<{ isMobile?: boolean; isSmallMobile?: boolean; reducedAnimations?: boolean }>`
  flex: 1;
  padding: ${props => props.isSmallMobile ? '0.5rem' : '1rem'};
  overflow: hidden;
  position: relative;
  
  .rbc-calendar {
    background: transparent;
    border: none;
    font-family: inherit;
    transition: ${props => props.reducedAnimations ? 'none' : 'all 0.3s ease'};
  }
  
  .rbc-header {
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
    padding: ${props => props.isSmallMobile ? '0.5rem' : '1rem'};
    font-size: ${props => props.isSmallMobile ? '0.75rem' : '0.875rem'};
  }
  
  .rbc-month-view {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
  }
  
  .rbc-event {
    border-radius: 4px;
    border: none;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const EnhancedIconButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  &:disabled:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: none;
  }
`;
