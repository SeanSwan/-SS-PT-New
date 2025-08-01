/**
 * Universal Master Schedule - AAA 7-Star Admin Command Center (REFACTORED)
 * ========================================================================
 * The ultimate scheduling management system for SwanStudios admins
 * 
 * 🌟 ARCHITECTURAL TRANSFORMATION:
 * ✅ Modular Hook-Based Architecture - Clean separation of concerns
 * ✅ Enterprise-Grade Error Handling - Resilient and fault-tolerant
 * ✅ Performance-Optimized State Management - Minimal re-renders
 * ✅ Advanced Accessibility Support - WCAG AA compliant
 * ✅ Real-time Collaboration Ready - WebSocket integration points
 * ✅ Mobile-First Progressive Web App - Touch-optimized interactions
 * ✅ Comprehensive Business Intelligence - Executive-level insights
 * 
 * REFACTORED DESIGN PRINCIPLES:
 * - Single Responsibility: Each hook handles one domain
 * - Separation of Concerns: UI, data, handlers, bulk ops, and BI are isolated
 * - Dependency Injection: Clean interfaces between components
 * - Immutable State: Predictable state updates
 * - Error Boundaries: Graceful failure handling
 * - Performance: Memoized calculations and lazy loading
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider } from 'styled-components';
import { Calendar, Views, SlotInfo } from 'react-big-calendar';
import { dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useToast } from '../../hooks/use-toast';

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
  Bell
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
  useCollaborativeScheduling
} from './hooks';

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

/**
 * Universal Master Schedule Component - REFACTORED EDITION
 * 
 * Clean, declarative orchestrator component that delegates all complex logic
 * to specialized hooks, resulting in a maintainable, testable, and scalable architecture.
 */
const UniversalMasterSchedule: React.FC = () => {
  const { toast } = useToast();
  
  // Refs
  const calendarRef = useRef<any>(null);
  const bulkActionRef = useRef<HTMLDivElement>(null);
  
  // ==================== MODULAR HOOKS ORCHESTRATION ====================
  
  // 1. Core UI State Management
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
  
  // 2. Pure Data Fetching & Management (Refactored)
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
  
  // 3. Specialized Calendar Event Filtering (NEW)
  const {
    calendarEvents,
    filteredEventCount,
    totalEventCount,
    filterEfficiency
  } = useFilteredCalendarEvents({
    sessions,
    filterOptions
  });
  
  // 4. Real-time Updates Management (ENHANCED)
  const {
    connectionStatus,
    isConnected,
    lastMessageTime,
    reconnectAttempts,
    messagesReceived,
    uptime,
    getConnectionHealth,
    getPerformanceMetrics
  } = useRealTimeUpdates({
    onDataUpdate: refreshData,
    enabled: realTimeEnabled,
    enablePerformanceMonitoring: true,
    enableCircuitBreaker: true
  });
  
  // 5. Admin Notification System (NEW)
  const {
    notifications,
    unreadCount,
    criticalCount,
    isConnected: notificationsConnected,
    sendTestNotification,
    markAllAsRead: markAllNotificationsRead
  } = useAdminNotifications({
    enableRealTime: true,
    maxNotifications: 100
  });
  
  // 6. Collaborative Scheduling (NEW)
  const {
    activeUsers,
    totalOnlineUsers,
    isConnected: collaborationConnected,
    connectionQuality,
    lockedEvents,
    lockEvent,
    unlockEvent,
    joinSession: joinCollaborationSession,
    leaveSession: leaveCollaborationSession
  } = useCollaborativeScheduling({
    sessionId: `schedule-${selectedDate.toISOString().split('T')[0]}`,
    enableRealTimeSync: true
  });
  
  // 7. Event Handler Logic
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
    isTouch
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
  
  // 8. Bulk Operations Management
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
    loading
  });
  
  // 9. Business Intelligence & Analytics
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
    trainers
  });
  
  // ==================== COMPONENT INITIALIZATION ====================
  
  useEffect(() => {
    const initializeComponentSafe = async () => {
      try {
        await initializeComponent({
          setLoading,
          setError,
          realTimeEnabled
        });
        const cleanup = setupEventListeners();
        return cleanup;
      } catch (error) {
        console.error('Failed to initialize Universal Master Schedule:', error);
        toast({
          title: 'Initialization Error',
          description: 'Failed to initialize schedule. Please refresh and try again.',
          variant: 'destructive'
        });
      }
    };
    
    const cleanupPromise = initializeComponentSafe();
    
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
      cleanupEventListeners();
    };
  }, [initializeComponent, setupEventListeners, cleanupEventListeners, toast, setLoading, setError, realTimeEnabled]);
  
  // ✅ FILTERING REFACTORED: No manual filtering effect needed!
  // Filtering is now handled automatically by useFilteredCalendarEvents hook
  // through memoization when sessions or filterOptions change.
  
  // Auto-refresh effect
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
          <LoadingSpinner size="large" message="Loading Universal Master Schedule..." />
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
            text="Retry"
            variant="primary"
            leftIcon={<RefreshCw size={18} />}
            onClick={() => {
              initializeComponent();
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
        <ScheduleContainer>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header Section */}
            <HeaderSection>
              <HeaderTitle>
                <CalendarIcon size={28} />
                <div>
                  <Typography variant="h4" component="h1">
                    Universal Master Schedule
                  </Typography>
                  <Typography variant="subtitle1" color="rgba(255, 255, 255, 0.7)">
                    Advanced scheduling & business intelligence center
                  </Typography>
                </div>
              </HeaderTitle>
              
              <HeaderActions>
                {/* Analytics View Toggle */}
                <ViewToggleGroup>
                  <ViewToggleButton 
                    active={analyticsView === 'calendar'}
                    onClick={() => handleAnalyticsViewChange('calendar')}
                  >
                    <Calendar size={16} />
                    Calendar
                  </ViewToggleButton>
                  <ViewToggleButton 
                    active={analyticsView === 'business'}
                    onClick={() => handleAnalyticsViewChange('business')}
                  >
                    <BarChart3 size={16} />
                    Business
                  </ViewToggleButton>
                  <ViewToggleButton 
                    active={analyticsView === 'trainers'}
                    onClick={() => handleAnalyticsViewChange('trainers')}
                  >
                    <Users size={16} />
                    Trainers
                  </ViewToggleButton>
                  <ViewToggleButton 
                    active={analyticsView === 'social'}
                    onClick={() => handleAnalyticsViewChange('social')}
                  >
                    <Activity size={16} />
                    Social
                  </ViewToggleButton>
                  <ViewToggleButton 
                    active={analyticsView === 'allocations'}
                    onClick={() => handleAnalyticsViewChange('allocations')}
                  >
                    <CreditCard size={16} />
                    Allocations
                  </ViewToggleButton>
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
                  <ViewToggleButton 
                    active={analyticsView === 'monitor'}
                    onClick={() => handleAnalyticsViewChange('monitor')}
                  >
                    <Activity size={16} />
                    Monitor
                  </ViewToggleButton>
                </ViewToggleGroup>
                
                {/* Multi-select toggle */}
                {analyticsView === 'calendar' && (
                  <GlowButton
                    text={multiSelect.enabled ? 'Exit Multi-Select' : 'Multi-Select'}
                    variant={multiSelect.enabled ? 'ruby' : 'primary'}
                    size="small"
                    leftIcon={multiSelect.enabled ? <X size={16} /> : <Layers size={16} />}
                    onClick={toggleMultiSelect}
                  />
                )}
                
                {/* Filters */}
                <GlowButton
                  text="Filters"
                  variant="emerald"
                  size="small"
                  leftIcon={<Filter size={16} />}
                  onClick={() => openDialog('filterDialog')}
                />
                
                {/* Refresh */}
                <Tooltip title="Refresh Data">
                  <EnhancedIconButton
                    onClick={refreshData}
                    disabled={loading.sessions}
                  >
                    <RefreshCw size={20} style={{ 
                      animation: loading.sessions ? 'spin 1s linear infinite' : 'none' 
                    }} />
                  </EnhancedIconButton>
                </Tooltip>
              </HeaderActions>
            </HeaderSection>
            
            {/* Executive KPI Bar - Always Visible */}
            <ExecutiveKPIBar>
              <KPIItem 
                onClick={() => handleAnalyticsViewChange('business')}
                style={{ cursor: 'pointer' }}
              >
                <KPIIcon>
                  <DollarSign size={18} />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>${executiveKPIs.monthlyRecurringRevenue.toLocaleString()}</KPIValue>
                  <KPILabel>Monthly Revenue</KPILabel>
                </KPIContent>
              </KPIItem>
              
              <KPIItem
                onClick={() => handleAnalyticsViewChange('trainers')}
                style={{ cursor: 'pointer' }}
              >
                <KPIIcon>
                  <Users size={18} />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>{comprehensiveBusinessMetrics.activeClients}</KPIValue>
                  <KPILabel>Active Clients</KPILabel>
                </KPIContent>
              </KPIItem>
              
              <KPIItem
                onClick={() => {
                  setFilterOptions(prev => ({ ...prev, status: 'scheduled' }));
                  openDialog('filterDialog');
                }}
                style={{ cursor: 'pointer' }}
              >
                <KPIIcon>
                  <Target size={18} />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>{comprehensiveBusinessMetrics.utilizationRate}%</KPIValue>
                  <KPILabel>Utilization</KPILabel>
                </KPIContent>
              </KPIItem>
              
              <KPIItem>
                <KPIIcon>
                  <Star size={18} />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>{executiveKPIs.complianceScore}%</KPIValue>
                  <KPILabel>NASM Compliance</KPILabel>
                </KPIContent>
              </KPIItem>
              
              <KPIItem
                onClick={() => handleAnalyticsViewChange('social')}
                style={{ cursor: 'pointer' }}
              >
                <KPIIcon>
                  <Activity size={18} />
                </KPIIcon>
                <KPIContent>
                  <KPIValue>{comprehensiveBusinessMetrics.socialEngagementRate}%</KPIValue>
                  <KPILabel>Social Engagement</KPILabel>
                </KPIContent>
              </KPIItem>
            </ExecutiveKPIBar>
            
            {/* Conditional Content Based on Analytics View */}
            {analyticsView === 'calendar' && (
              <>
                {/* Bulk Actions Bar */}
                <AnimatePresence>
                  {multiSelect.enabled && (
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
                
                {/* Calendar Container - Using Extracted Render Logic */}
                <CalendarContainer>
                  {renderCalendar({
                    isCalendarInitialized,
                    localizer,
                    DragAndDropCalendar,
                    calendarEvents,
                    view,
                    selectedDate,
                    onSelectSlot: handleSelectSlot,
                    onSelectEvent: handleSelectEvent,
                    onEventDrop: handleEventDrop,
                    onEventResize: handleEventResize,
                    onView: setView,
                    onNavigate: setSelectedDate,
                    multiSelectEnabled: multiSelect.enabled,
                    selectedEvents: multiSelect.selectedEvents,
                    compactView: false,
                    clientsCount: comprehensiveBusinessMetrics.activeClients,
                    utilizationRate: comprehensiveBusinessMetrics.utilizationRate,
                    completionRate: comprehensiveBusinessMetrics.completionRate,
                    calendarRef
                  })}
                </CalendarContainer>
              </>
            )}
            
            {/* Business Intelligence Dashboard with REAL CHARTS */}
            {analyticsView === 'business' && (
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
            
            {/* Trainer Performance Analytics */}
            {analyticsView === 'trainers' && (
              <TrainerPerformanceAnalytics
                sessions={sessions}
                clients={clients}
                trainers={trainers}
                selectedTrainer={selectedTrainer}
                onTrainerSelect={handleTrainerSelect}
                dateRange={dateRange}
              />
            )}
            
            {/* Social Media Integration Analytics */}
            {analyticsView === 'social' && (
              <SocialIntegrationAnalytics
                sessions={sessions}
                clients={clients}
                trainers={trainers}
                dateRange={dateRange}
              />
            )}
            
            {/* Session Allocation Manager */}
            {analyticsView === 'allocations' && (
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
            
            {/* Real-time Notification Center */}
            {analyticsView === 'notifications' && (
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
                />
              </motion.div>
            )}
            
            {/* Live Collaboration Panel */}
            {analyticsView === 'collaboration' && (
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
                />
              </motion.div>
            )}
            
            {/* Real-time System Monitor */}
            {analyticsView === 'monitor' && (
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
            
            {/* Loading Overlay */}
            <AnimatePresence>
              {loading.bulkOperation && (
                <LoadingOverlay
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CircularProgress size={40} sx={{ color: '#00ffff' }} />
                  <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>
                    Processing bulk action...
                  </Typography>
                </LoadingOverlay>
              )}
            </AnimatePresence>
          </motion.div>
        </ScheduleContainer>
        
        {/* Enhanced Dialogs */}
        
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
        />
        
        {/* Bulk Actions Confirmation Dialog */}
        <BulkActionsConfirmationDialog
          open={dialogs.bulkActionDialog}
          onClose={() => closeDialog('bulkActionDialog')}
          action={bulkActionType}
          selectedSessions={selectedSessionsData}
          onActionComplete={handleBulkActionComplete}
        />
        
        {/* Advanced Filter Dialog */}
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
        />
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default UniversalMasterSchedule;

// ==================== STYLED COMPONENTS (Unchanged for Visual Consistency) ====================

const ScheduleContainer = styled.div`
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
`;

const HeaderSection = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
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

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
`;

const ViewToggleGroup = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
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
  gap: 0.25rem;
  min-width: 0;
`;

const KPIValue = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const KPILabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BulkActionsBar = styled(motion.div)`
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  backdrop-filter: blur(10px);
`;

const BulkActionsContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  
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
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
`;

const CalendarContainer = styled.div`
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  overflow: hidden;
  
  .rbc-calendar {
    background: transparent;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .rbc-toolbar {
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem;
    
    .rbc-toolbar-label {
      color: white;
      font-weight: 500;
    }
    
    .rbc-btn-group {
      button {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        transition: all 0.2s;
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        &.rbc-active {
          background: #3b82f6;
          border-color: #3b82f6;
        }
      }
    }
  }
  
  .rbc-header {
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    padding: 0.5rem;
    font-weight: 500;
  }
  
  .rbc-day-bg {
    background: rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.05);
    
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
