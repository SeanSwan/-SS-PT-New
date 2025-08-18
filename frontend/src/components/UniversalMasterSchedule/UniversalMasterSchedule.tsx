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
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  
  // 4. Real-time Updates Management (ENHANCED) - Fixed duplicate getPerformanceMetrics: getRealTimePerformanceMetrics
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
  
  // Enhanced session action handler with celebrations
  const handleEnhancedSessionAction = useCallback(async (action: string, sessionId?: string, additionalData?: any) => {
    try {
      // Pre-action micro-interaction
      microHandleSessionAction(action as any, true);
      
      // Animate the action button
      if (sessionId) {
        animateElement(`${action}-button-${sessionId}`, 'pulse', 200);
      }
      
      // Check for celebration triggers
      if (action === 'complete' && additionalData?.isStreak) {
        handleCelebration('streak');
      } else if (action === 'complete' && additionalData?.isMilestone) {
        handleCelebration('milestone');
      }
      
    } catch (error) {
      console.error(`Error handling ${action}:`, error);
      microHandleSessionAction(action as any, false);
      
      // Error animation
      if (sessionId) {
        animateElement(`${action}-button-${sessionId}`, 'shake', 400);
      }
    }
  }, [microHandleSessionAction, animateElement, handleCelebration]);
  
  // Enhanced navigation with micro-interactions
  const handleEnhancedNavigation = useCallback((direction: 'forward' | 'back' | 'up' | 'down', targetView?: string) => {
    handleNavigation(direction);
    
    if (targetView) {
      animateElement(`view-${targetView}`, 'slide', 300);
    }
  }, [handleNavigation, animateElement]);
  
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
  
  // ==================== PHASE 2B: MOBILE ADMIN INTEGRATION EFFECTS ====================
  
  // Integrate with admin mobile menu state
  useEffect(() => {
    if (adminDeviceType === 'mobile' && adminMobileMenuOpen) {
      // When admin mobile menu opens, reduce calendar interactions
      collapseMobileHeader(true);
      if (onMobileAdminAction) {
        onMobileAdminAction('calendar_menu_opened', { 
          currentView: view, 
          selectedDate 
        });
      }
    } else if (adminDeviceType === 'mobile' && !adminMobileMenuOpen) {
      // When admin mobile menu closes, restore calendar interactions
      collapseMobileHeader(false);
      if (onMobileAdminAction) {
        onMobileAdminAction('calendar_menu_closed', { 
          currentView: view, 
          selectedDate 
        });
      }
    }
  }, [adminMobileMenuOpen, adminDeviceType, onMobileAdminAction, view, selectedDate, collapseMobileHeader]);
  
  // Enhanced mobile navigation integration
  const handleMobileAdminNavigation = useCallback((direction: 'forward' | 'back' | 'up' | 'down') => {
    // Handle navigation within calendar context
    switch (direction) {
      case 'forward':
        navigateNext();
        break;
      case 'back':
        navigatePrevious();
        break;
      case 'up':
        // Cycle to previous view
        const currentIndex = supportedMobileViews.indexOf(view);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : supportedMobileViews.length - 1;
        setView(supportedMobileViews[prevIndex]);
        break;
      case 'down':
        // Cycle to next view
        cycleMobileViews();
        break;
    }
    
    // Trigger haptic feedback for mobile admin navigation
    triggerHaptic('light');
    
    // Notify admin navigation handler
    if (onMobileAdminNavigation) {
      onMobileAdminNavigation(direction);
    }
  }, [navigateNext, navigatePrevious, supportedMobileViews, view, setView, cycleMobileViews, triggerHaptic, onMobileAdminNavigation]);
  
  // Mobile admin performance optimizations
  useEffect(() => {
    if (adminMobileOptimized) {
      // Apply mobile admin performance settings
      if (mobileAdminReducedAnimations && !reducedAnimations) {
        enableMobileOptimizations();
      }
      
      if (mobileAdminOptimizedRendering && !optimizedRendering) {
        optimizeForMobile();
      }
    }
  }, [adminMobileOptimized, mobileAdminReducedAnimations, mobileAdminOptimizedRendering, reducedAnimations, optimizedRendering, enableMobileOptimizations, optimizeForMobile]);
  
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
                {/* Mobile Header Collapse Toggle */}
                {mobileOptimized && (
                  <Tooltip title={mobileHeaderCollapsed ? 'Expand header' : 'Collapse header'}>
                    <EnhancedIconButton
                      onClick={() => collapseMobileHeader(!mobileHeaderCollapsed)}
                    >
                      {mobileHeaderCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </EnhancedIconButton>
                  </Tooltip>
                )}
                
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
                
                {/* Role-Based Analytics View Toggle */}
                <ViewToggleGroup isMobile={mobileOptimized} isSmallMobile={isSmallMobile}>
                  {/* Calendar View - Available to all roles */}
                  {roleConfig.availableViews.includes('calendar') && (
                    <ViewToggleButton 
                      active={analyticsView === 'calendar'}
                      onClick={() => handleAnalyticsViewChange('calendar')}
                    >
                      <CalendarIcon size={16} />
                      {currentUserRole === 'user' ? 'Book' : 'Calendar'}
                    </ViewToggleButton>
                  )}
                  
                  {/* Business View - Admin only */}
                  {roleConfig.availableViews.includes('business') && (
                    <ViewToggleButton 
                      active={analyticsView === 'business'}
                      onClick={() => handleAnalyticsViewChange('business')}
                    >
                      <BarChart3 size={16} />
                      Business
                    </ViewToggleButton>
                  )}
                  
                  {/* Trainers View - Admin and Trainer */}
                  {roleConfig.availableViews.includes('trainers') && (
                    <ViewToggleButton 
                      active={analyticsView === 'trainers'}
                      onClick={() => handleAnalyticsViewChange('trainers')}
                    >
                      <Users size={16} />
                      {currentUserRole === 'trainer' ? 'Clients' : 'Trainers'}
                    </ViewToggleButton>
                  )}
                  
                  {/* Social View - Admin only */}
                  {roleConfig.availableViews.includes('social') && (
                    <ViewToggleButton 
                      active={analyticsView === 'social'}
                      onClick={() => handleAnalyticsViewChange('social')}
                    >
                      <Activity size={16} />
                      Social
                    </ViewToggleButton>
                  )}
                  
                  {/* Allocations View - Admin only */}
                  {roleConfig.availableViews.includes('allocations') && (
                    <ViewToggleButton 
                      active={analyticsView === 'allocations'}
                      onClick={() => handleAnalyticsViewChange('allocations')}
                    >
                      <CreditCard size={16} />
                      Allocations
                    </ViewToggleButton>
                  )}
                  
                  {/* Notifications View - Admin, Trainer, Client */}
                  {roleConfig.availableViews.includes('notifications') && (
                    <ViewToggleButton 
                      active={analyticsView === 'notifications'}
                      onClick={() => handleAnalyticsViewChange('notifications')}
                    >
                      <Bell size={16} />
                      Notifications
                      {unreadCount > 0 && (
                        <span style={{
                          background: '#ef4444',
                          color: 'white',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.625rem',
                          marginLeft: '0.25rem'
                        }}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </ViewToggleButton>
                  )}
                  
                  {/* Collaboration View - Admin and Trainer */}
                  {roleConfig.availableViews.includes('collaboration') && (
                    <ViewToggleButton 
                      active={analyticsView === 'collaboration'}
                      onClick={() => handleAnalyticsViewChange('collaboration')}
                    >
                      <Users size={16} />
                      Collaboration
                      {totalOnlineUsers > 1 && (
                        <span style={{
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.625rem',
                          marginLeft: '0.25rem'
                        }}>
                          {totalOnlineUsers}
                        </span>
                      )}
                    </ViewToggleButton>
                  )}
                  
                  {/* Monitor View - Admin only */}
                  {roleConfig.availableViews.includes('monitor') && (
                    <ViewToggleButton 
                      active={analyticsView === 'monitor'}
                      onClick={() => handleAnalyticsViewChange('monitor')}
                    >
                      <Activity size={16} />
                      Monitor
                    </ViewToggleButton>
                  )}
                </ViewToggleGroup>
                
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
                
                {/* Role-Based Action Buttons */}
                {analyticsView === 'calendar' && (
                  <>
                    {/* Multi-select toggle - Admin only */}
                    {roleConfig.showMultiSelect && (
                      <GlowButton
                        text={multiSelect.enabled ? 'Exit Multi-Select' : 'Multi-Select'}
                        variant={multiSelect.enabled ? 'ruby' : 'primary'}
                        size="small"
                        leftIcon={multiSelect.enabled ? <X size={16} /> : <Layers size={16} />}
                        onClick={() => {
                          triggerHaptic('selection');
                          animateElement('multi-select-button', 'pulse', 200);
                          toggleMultiSelect();
                        }}
                      />
                    )}
                    
                    {/* Filters - Role-based complexity */}
                    {roleConfig.showAdvancedFilters ? (
                      <GlowButton
                        text="Filters"
                        variant="emerald"
                        size="small"
                        leftIcon={<Filter size={16} />}
                        onClick={() => {
                          triggerHaptic('light');
                          animateElement('filter-dialog', 'slide', 300);
                          openDialog('filterDialog');
                        }}
                      />
                    ) : (
                      // Simple filter for clients
                      <Tooltip title="Filter available sessions">
                        <EnhancedIconButton
                          onClick={() => {
                            triggerHaptic('light');
                            animateElement('filter-button', 'pulse', 200);
                            setFilterOptions(prev => ({ 
                              ...prev, 
                              status: prev.status === 'available' ? 'all' : 'available' 
                            }));
                          }}
                        >
                          <Filter size={20} />
                        </EnhancedIconButton>
                      </Tooltip>
                    )}
                  </>
                )}
                
                {/* Book Session Button - Client and User roles */}
                {(currentUserRole === 'client' || currentUserRole === 'user') && analyticsView === 'calendar' && (
                  <GlowButton
                    text="Book Session"
                    variant="cosmic"
                    size="small"
                    leftIcon={<BookOpen size={16} />}
                    onClick={() => {
                      triggerHaptic('medium');
                      animateElement('book-session-button', 'pulse', 300);
                      animateElement('session-form-dialog', 'scale', 400);
                      setSessionFormMode('book');
                      openDialog('sessionFormDialog');
                    }}
                  />
                )}
                
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
            
            {/* Role-Based KPI Bar */}
            {roleConfig.showKPIs && roleKPIs.length > 0 && (
              <ExecutiveKPIBar>
                {roleKPIs.map((kpi, index) => (
                  <KPIItem 
                    key={index}
                    onClick={kpi.onClick ? () => handleAnalyticsViewChange(kpi.onClick) : undefined}
                    style={{ cursor: kpi.onClick ? 'pointer' : 'default' }}
                  >
                    <KPIIcon>
                      <kpi.icon size={18} />
                    </KPIIcon>
                    <KPIContent>
                      <KPIValue>{kpi.value}</KPIValue>
                      <KPILabel>{kpi.label}</KPILabel>
                    </KPIContent>
                  </KPIItem>
                ))}
              </ExecutiveKPIBar>
            )}
            
            {/* Conditional Content Based on Analytics View */}
            {analyticsView === 'calendar' && (
              <>
                {/* Bulk Actions Bar - Admin only */}
                <AnimatePresence>
                  {roleConfig.showBulkActions && multiSelect.enabled && (
                    <BulkActionsBar
                      ref={bulkActionRef}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <BulkActionsContent>
                        <div>
                          <Typography variant="h6" sx={{ color: 'white' }}>
                            {selectedCount} sessions selected
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Choose an action to apply to all selected sessions
                          </Typography>
                        </div>
                        
                        <BulkActionButtons>
                          <GlowButton
                            text="Select All"
                            variant="primary"
                            size="small"
                            leftIcon={<CheckCircle size={16} />}
                            onClick={selectAllEvents}
                          />
                          
                          <GlowButton
                            text="Clear"
                            variant="ruby"
                            size="small"
                            leftIcon={<X size={16} />}
                            onClick={clearSelection}
                          />
                          
                          <Divider orientation="vertical" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                          
                          <GlowButton
                            text="Confirm"
                            variant="emerald"
                            size="small"
                            leftIcon={<CheckCircle size={16} />}
                            onClick={() => initiateBulkAction('confirm')}
                            disabled={!canPerformBulkActions}
                          />
                          
                          <GlowButton
                            text="Cancel"
                            variant="ruby"
                            size="small"
                            leftIcon={<X size={16} />}
                            onClick={() => initiateBulkAction('cancel')}
                            disabled={!canPerformBulkActions}
                          />
                          
                          <GlowButton
                            text="Reassign"
                            variant="cosmic"
                            size="small"
                            leftIcon={<Move size={16} />}
                            onClick={() => initiateBulkAction('reassign')}
                            disabled={!canPerformBulkActions}
                          />
                          
                          <GlowButton
                            text="Delete"
                            variant="ruby"
                            size="small"
                            leftIcon={<Trash2 size={16} />}
                            onClick={() => initiateBulkAction('delete')}
                            disabled={!canPerformBulkActions}
                          />
                        </BulkActionButtons>
                      </BulkActionsContent>
                    </BulkActionsBar>
                  )}
                </AnimatePresence>
                
                {/* Enhanced Mobile Navigation Controls with Admin Integration */}
                {(mobileOptimized || adminDeviceType === 'mobile') && (
                  <MobileNavigationBar>
                    <MobileNavButton 
                      onClick={() => {
                        navigatePrevious();
                        if (onMobileAdminNavigation) onMobileAdminNavigation('back');
                      }}
                      disabled={adminMobileMenuOpen && adminDeviceType === 'mobile'}
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </MobileNavButton>
                    
                    <MobileViewCycler 
                      onClick={() => {
                        cycleMobileViews();
                        if (onMobileAdminNavigation) onMobileAdminNavigation('down');
                      }}
                      disabled={adminMobileMenuOpen && adminDeviceType === 'mobile'}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)} View
                    </MobileViewCycler>
                    
                    <MobileNavButton 
                      onClick={() => {
                        navigateToToday();
                        if (onMobileAdminAction) onMobileAdminAction('navigate_today', { date: new Date() });
                      }}
                      disabled={adminMobileMenuOpen && adminDeviceType === 'mobile'}
                    >
                      Today
                    </MobileNavButton>
                    
                    <MobileNavButton 
                      onClick={() => {
                        navigateNext();
                        if (onMobileAdminNavigation) onMobileAdminNavigation('forward');
                      }}
                      disabled={adminMobileMenuOpen && adminDeviceType === 'mobile'}
                    >
                      Next
                      <ChevronRight size={18} />
                    </MobileNavButton>
                    
                    {/* Mobile Admin Menu Toggle Integration */}
                    {mobileAdminMode && adminDeviceType === 'mobile' && onAdminMobileMenuToggle && (
                      <MobileNavButton 
                        onClick={() => onAdminMobileMenuToggle(!adminMobileMenuOpen)}
                        style={{
                          background: adminMobileMenuOpen 
                            ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                            : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          borderColor: adminMobileMenuOpen ? '#ef4444' : '#3b82f6',
                          marginLeft: '0.5rem'
                        }}
                      >
                        {adminMobileMenuOpen ? 'Close Menu' : 'Admin Menu'}
                      </MobileNavButton>
                    )}
                  </MobileNavigationBar>
                )}
                
                {/* Calendar Container - Enhanced with Role-Based Modes */}
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
              </>
            )}
            
            {/* Business Intelligence Dashboard - Admin only */}
            {analyticsView === 'business' && roleConfig.availableViews.includes('business') && (
              <BusinessAnalyticsContainer>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Grid container spacing={3}>
                    {/* Revenue Analytics with REAL LINE CHART */}
                    <Grid item xs={12} lg={6}>
                      <MetricCard>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                          Revenue Analytics
                        </Typography>
                        <RevenueLineChart 
                          data={revenueChartData} 
                          height={250}
                          showProjection={true}
                          timeRange={dateRange as any}
                        />
                      </MetricCard>
                    </Grid>

                    {/* Trainer Performance with REAL BAR CHART */}
                    <Grid item xs={12} lg={6}>
                      <MetricCard>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                          Trainer Performance
                        </Typography>
                        <TrainerPerformanceBarChart 
                          data={trainerChartData}
                          height={250}
                          metric="revenue"
                          showComparison={true}
                          sortBy="revenue"
                        />
                      </MetricCard>
                    </Grid>

                    {/* Session Distribution with REAL PIE CHART */}
                    <Grid item xs={12} lg={4}>
                      <MetricCard>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                          Session Distribution
                        </Typography>
                        <SessionDistributionPieChart 
                          data={sessionDistributionData}
                          height={250}
                          showLegend={true}
                          showLabels={true}
                        />
                      </MetricCard>
                    </Grid>

                    {/* Enhanced KPIs with Insights */}
                    <Grid item xs={12} lg={8}>
                      <MetricCard>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                          Key Performance Indicators & Insights
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <MetricItem>
                              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                Revenue/Session
                              </Typography>
                              <Typography variant="h6" color="white">
                                ${executiveKPIs.revenuePerSession}
                              </Typography>
                            </MetricItem>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricItem>
                              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                Client LTV
                              </Typography>
                              <Typography variant="h6" color="white">
                                ${executiveKPIs.clientLifetimeValue.toLocaleString()}
                              </Typography>
                            </MetricItem>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricItem>
                              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                CAC
                              </Typography>
                              <Typography variant="h6" color="white">
                                ${executiveKPIs.customerAcquisitionCost}
                              </Typography>
                            </MetricItem>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <MetricItem>
                              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                NPS Score
                              </Typography>
                              <Typography variant="h6" color="white">
                                {executiveKPIs.netPromoterScore}
                              </Typography>
                            </MetricItem>
                          </Grid>
                        </Grid>
                        
                        {/* AI-Generated Insights */}
                        <div style={{ marginTop: '1.5rem' }}>
                          <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                            💡 AI-Generated Insights
                          </Typography>
                          {generateInsights().map((insight, index) => (
                            <Typography 
                              key={index}
                              variant="body2" 
                              sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5 }}
                            >
                              {insight}
                            </Typography>
                          ))}
                        </div>
                      </MetricCard>
                    </Grid>
                  </Grid>
                </motion.div>
              </BusinessAnalyticsContainer>
            )}
            
            {/* Trainer Performance Analytics - Admin and Trainer */}
            {analyticsView === 'trainers' && roleConfig.availableViews.includes('trainers') && (
              <TrainerPerformanceAnalytics
                sessions={sessions}
                clients={clients}
                trainers={trainers}
                selectedTrainer={selectedTrainer}
                onTrainerSelect={handleTrainerSelect}
                dateRange={dateRange}
                userRole={currentUserRole}
                userId={currentUserId}
              />
            )}
            
            {/* Social Media Integration Analytics - Admin only */}
            {analyticsView === 'social' && roleConfig.availableViews.includes('social') && (
              <SocialIntegrationAnalytics
                sessions={sessions}
                clients={clients}
                trainers={trainers}
                dateRange={dateRange}
              />
            )}
            
            {/* Session Allocation Manager - Admin only */}
            {analyticsView === 'allocations' && roleConfig.availableViews.includes('allocations') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SessionAllocationManager 
                  onAllocationUpdate={(allocation) => {
                    console.log('💰 Session allocation updated:', allocation);
                    refreshData();
                  }}
                  showControls={true}
                  compactView={false}
                />
              </motion.div>
            )}
            
            {/* Real-time Notification Center - Admin, Trainer, Client */}
            {analyticsView === 'notifications' && roleConfig.availableViews.includes('notifications') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ padding: '1rem' }}
              >
                <AdminNotificationCenter 
                  maxHeight="600px"
                  enableSound={true}
                  enableDesktop={false}
                  userRole={currentUserRole}
                />
              </motion.div>
            )}
            
            {/* Live Collaboration Panel - Admin and Trainer */}
            {analyticsView === 'collaboration' && roleConfig.availableViews.includes('collaboration') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ padding: '1rem' }}
              >
                <CollaborativeSchedulingPanel 
                  sessionId={`schedule-${selectedDate.toISOString().split('T')[0]}`}
                  onEventLock={(eventId, userId) => {
                    console.log('🔒 Event locked:', eventId, 'by user:', userId);
                  }}
                  onEventUnlock={(eventId) => {
                    console.log('🔓 Event unlocked:', eventId);
                  }}
                  userRole={currentUserRole}
                />
              </motion.div>
            )}
            
            {/* Real-time System Monitor - Admin only */}
            {analyticsView === 'monitor' && roleConfig.availableViews.includes('monitor') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ padding: '1rem' }}
              >
                <RealTimeSystemMonitor 
                  refreshInterval={5000}
                  enableAlerts={true}
                />
              </motion.div>
            )}
            
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
        
        {/* Enhanced Dialogs with Role-Based Features */}
        
        {/* Session Form Dialog */}
        <SessionFormDialog
          open={dialogs.sessionFormDialog}
          onClose={() => closeDialog('sessionFormDialog')}
          mode={sessionFormMode}
          session={sessionFormInitialData?.session}
          clients={clients}
          trainers={trainers}
          onSessionSaved={handleSessionSaved}
          initialDate={sessionFormInitialData?.initialDate}
          initialTrainer={sessionFormInitialData?.initialTrainer}
          userRole={currentUserRole}
          userId={currentUserId}
        />
        
        {/* Bulk Actions Confirmation Dialog - Admin only */}
        {roleConfig.showBulkActions && (
          <BulkActionsConfirmationDialog
            open={dialogs.bulkActionDialog}
            onClose={() => closeDialog('bulkActionDialog')}
            action={bulkActionType}
            selectedSessions={selectedSessionsData}
            onActionComplete={handleBulkActionComplete}
          />
        )}
        
        {/* Advanced Filter Dialog - Role-aware filtering */}
        <AdvancedFilterDialog
          open={dialogs.filterDialog}
          onClose={() => closeDialog('filterDialog')}
          currentFilters={filterOptions}
          onFiltersChange={setFilterOptions}
          sessions={sessions}
          clients={clients}
          trainers={trainers}
          onExportFiltered={(filteredSessions) => {
            console.log('Exporting filtered sessions:', filteredSessions);
          }}
          userRole={currentUserRole}
          showAdvancedOptions={roleConfig.showAdvancedFilters}
        />
      </ErrorBoundary>
      
      {/* PHASE 3: Celebration Effects Overlay */}
      <CelebrationEffects ref={celebrationEffectsRef} />
    </ThemeProvider>
  );
};

export default UniversalMasterSchedule;

// ==================== STYLED COMPONENTS (Enhanced for Role-Based UI) ====================

// ==================== PHASE 2B: ENHANCED MOBILE ADMIN INTEGRATION STYLED COMPONENTS ====================

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
  
  /* Phase 2B: Mobile Admin Layout Adjustments */
  ${props => props.mobileAdminMode && `
    /* Adjust layout when admin sidebar is open on mobile */
    margin-left: ${props.adminMobileMenuOpen && props.adminDeviceType === 'mobile' ? '0' : '0'};
    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Mobile admin overlay protection */
    ${props.adminMobileMenuOpen && props.adminDeviceType === 'mobile' ? `
      pointer-events: none;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 999;
        pointer-events: auto;
        backdrop-filter: blur(2px);
      }
    ` : ''}
  `}
  
  /* Enhanced mobile admin breakpoint handling */
  @media (max-width: 768px) {
    margin-left: 0 !important;
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    /* Tablet admin layout */
    margin-left: ${props => props.adminMobileMenuOpen && props.adminDeviceType === 'tablet' ? '240px' : '0'};
  }
  
  @media (min-width: 1025px) {
    /* Desktop admin layout */
    margin-left: ${props => props.mobileAdminMode ? '280px' : '0'};
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

const ViewToggleGroup = styled.div<{ isMobile?: boolean; isSmallMobile?: boolean }>`
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.isSmallMobile ? '8px' : '12px'};
  padding: ${props => props.isSmallMobile ? '2px' : '4px'};
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  overflow-x: auto;
  
  /* Hide scrollbar on mobile */
  &::-webkit-scrollbar {
    display: ${props => props.isMobile ? 'none' : 'block'};
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: ${props => props.isSmallMobile ? 'flex-start' : 'space-between'};
    gap: ${props => props.isSmallMobile ? '2px' : '4px'};
  }
  
  @media (max-width: 480px) {
    padding: 2px;
    border-radius: 8px;
  }
`;

const ViewToggleButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 
    'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
    'transparent'
  };
  border: none;
  border-radius: 8px;
  color: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: ${props => props.active ? 600 : 400};
  min-width: 80px;
  justify-content: center;
  
  &:hover {
    background: ${props => props.active ? 
      'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
      'rgba(255, 255, 255, 0.1)'
    };
    color: white;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    transition: transform 0.2s;
  }
  
  &:hover svg {
    transform: scale(1.1);
  }
`;

const ExecutiveKPIBar = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 2px;
    
    &:hover {
      background: rgba(59, 130, 246, 0.7);
    }
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    gap: 1rem;
  }
`;

const KPIItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 140px;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
`;

const KPIIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
`;

const KPIContent = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const KPIValue = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  line-height: 1.2;
`;

const KPILabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
`;

// Additional styled components would continue here...
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
  
  .rbc-date-cell {
    padding: ${props => props.isSmallMobile ? '0.25rem' : '0.5rem'};
    
    &.rbc-off-range-bg {
      background: rgba(255, 255, 255, 0.02);
    }
    
    &.rbc-today {
      background: rgba(59, 130, 246, 0.1);
    }
  }
  
  .rbc-time-slot {
    border-color: rgba(255, 255, 255, 0.05);
  }
  
  .rbc-time-gutter {
    background: rgba(0, 0, 0, 0.2);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    
    .rbc-time-slot {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
    }
  }
  
  .rbc-current-time-indicator {
    background: #3b82f6;
    height: 2px;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
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
  
  .rbc-event-selected {
    box-shadow: 0 0 0 2px #3b82f6;
  }
`;

const BusinessAnalyticsContainer = styled.div`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  height: 100%;
`;

const MetricItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
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

// ==================== PHASE 2: MOBILE-SPECIFIC STYLED COMPONENTS ====================

const MobileNavigationBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  gap: 0.5rem;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileNavButton = styled.button`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 40px;
  
  &:active {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
    transform: scale(0.98);
  }
  
  &:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
  }
`;

const MobileViewCycler = styled.button`
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
  flex: 1;
  max-width: 120px;
  
  &:active {
    transform: scale(0.98);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &:hover {
    background: linear-gradient(135deg, #2563eb, #1e40af);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const BulkActionsBar = styled(motion.div)`
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  overflow: hidden;
`;

const BulkActionsContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  gap: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
`;

const BulkActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;
